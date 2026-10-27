import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_URL = `${process.env.PUBLIC_URL}/models/factory.glb`;

// Free GPU buffers for every geometry and material in a loaded model.
function disposeModel(root) {
  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material && material.dispose());
  });
}

function FactoryScene() {
  const mountRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const mount = mountRef.current;
    let isDisposed = false;
    let teardown = () => {};

    const handleLoad = (gltf) => {
      // Unmounted while downloading: drop the model instead of building a scene.
      if (isDisposed) {
        disposeModel(gltf.scene);
        return;
      }

      const width = mount.clientWidth;
      const height = mount.clientHeight;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch {
        // WebGL unavailable: same outcome as a failed download.
        disposeModel(gltf.scene);
        setStatus('error');
        return;
      }
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b0d17);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.2));
      const sun = new THREE.DirectionalLight(0xffffff, 2);
      sun.position.set(50, 100, 70);
      scene.add(sun);
      scene.add(gltf.scene);

      // Every embedded clip loops forever. Deliberately not gated on reduced motion
      // (see design.md "3D scene ignores reduced motion").
      const mixer = new THREE.AnimationMixer(gltf.scene);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      const timer = new THREE.Timer();

      // Fit the model's bounding sphere into the vertical field of view.
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const centre = box.getCenter(new THREE.Vector3());
      const radius = box.getSize(new THREE.Vector3()).length() / 2;
      const camera = new THREE.PerspectiveCamera(45, width / height || 1);
      const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.near = distance / 100;
      camera.far = distance * 10;
      camera.position.copy(centre).addScaledVector(new THREE.Vector3(1, 0.6, 1).normalize(), distance);
      camera.updateProjectionMatrix();

      // Slow auto-orbit that resumes after the user drags; zoom stays outside the
      // bounding sphere and within 3× the framing distance.
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(centre);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.minDistance = radius;
      controls.maxDistance = 3 * distance;
      controls.update();

      let frameId;
      const animate = () => {
        timer.update();
        mixer.update(timer.getDelta());
        controls.update();
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      };
      animate();

      const handleResize = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      teardown = () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener('resize', handleResize);
        mixer.stopAllAction();
        mixer.uncacheRoot(gltf.scene);
        controls.dispose();
        disposeModel(gltf.scene);
        renderer.dispose();
        renderer.domElement.remove();
      };
      setStatus('ready');
    };

    const handleError = () => {
      if (!isDisposed) setStatus('error');
    };

    new GLTFLoader().load(MODEL_URL, handleLoad, undefined, handleError);

    return () => {
      isDisposed = true;
      teardown();
    };
  }, []);

  return (
    <div ref={mountRef} className="FactoryScene">
      {status === 'loading' && (
        <p className="FactoryScene-message" role="status">
          Loading factory…
        </p>
      )}
      {status === 'error' && (
        <p className="FactoryScene-message" role="alert">
          Could not load the 3D model.
        </p>
      )}
    </div>
  );
}

export default FactoryScene;
