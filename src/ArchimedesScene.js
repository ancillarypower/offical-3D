import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeModel, fitDistance, pixelRatio } from './threeHelpers';

const MODEL_URL = `${process.env.PUBLIC_URL}/models/Archimedes_opt_anim.glb`;

// The Archimedes screw hydro-power unit, viewed like the Home factory scene's base:
// sky gradient, fitted camera, auto-orbit and looping animation.
function ArchimedesScene() {
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
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        // WebGL unavailable: same outcome as a failed download.
        disposeModel(gltf.scene);
        setStatus('error');
        return;
      }
      // Transparent clear so the CSS sky gradient on .ArchimedesScene shows through.
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.2));
      const sun = new THREE.DirectionalLight(0xffffff, 2);
      sun.position.set(50, 100, 70);
      scene.add(sun);
      scene.add(gltf.scene);

      // Every embedded clip loops forever, regardless of reduced motion
      // (replace-home-sphere-with-factory-model, "3D scene ignores reduced motion").
      const mixer = new THREE.AnimationMixer(gltf.scene);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      const timer = new THREE.Timer();

      // Fit the model's bounding sphere into the narrower field of view.
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const centre = box.getCenter(new THREE.Vector3());
      const radius = box.getSize(new THREE.Vector3()).length() / 2;
      const camera = new THREE.PerspectiveCamera(45, width / height || 1);
      let fit = fitDistance(radius, camera.fov, camera.aspect);
      camera.near = fit / 100;
      camera.far = fit * 10;
      camera.position.copy(centre).addScaledVector(new THREE.Vector3(1, 0.6, 1).normalize(), fit);
      camera.updateProjectionMatrix();

      // Slow auto-orbit that resumes after the user drags; zoom stays outside the
      // bounding sphere and within 3× the fit distance.
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(centre);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.minDistance = radius;
      controls.maxDistance = 3 * fit;
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

      // Re-fit whenever the container changes size (window resize, rotation, or a
      // dvh change when mobile toolbars move). The camera keeps its direction and
      // its zoom relative to the fit distance.
      const resizeObserver = new ResizeObserver(() => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (!w || !h) return;
        renderer.setPixelRatio(pixelRatio());
        renderer.setSize(w, h);
        camera.aspect = w / h;
        const nextFit = fitDistance(radius, camera.fov, camera.aspect);
        const offset = camera.position.clone().sub(controls.target);
        camera.position.copy(controls.target).addScaledVector(offset, nextFit / fit);
        fit = nextFit;
        camera.near = fit / 100;
        camera.far = fit * 10;
        camera.updateProjectionMatrix();
        controls.maxDistance = 3 * fit;
        controls.update();
      });
      resizeObserver.observe(mount);

      teardown = () => {
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
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
    <div ref={mountRef} className="ArchimedesScene">
      {status === 'loading' && (
        <p className="ArchimedesScene-message" role="status">
          Loading Archimedes screw…
        </p>
      )}
      {status === 'error' && (
        <p className="ArchimedesScene-message" role="alert">
          Could not load the 3D model.
        </p>
      )}
    </div>
  );
}

export default ArchimedesScene;
