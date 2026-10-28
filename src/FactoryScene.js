import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_URL = `${process.env.PUBLIC_URL}/models/factory0.glb`;

// Phones report 3; rendering at 2 draws 4× instead of 9× the base pixel count.
const pixelRatio = () => Math.min(window.devicePixelRatio, 2);

// Camera distance at which a bounding sphere of `radius` fits whichever of the
// vertical and horizontal fields of view is narrower at this aspect ratio.
export function fitDistance(radius, verticalFovDeg, aspect) {
  const safeAspect = aspect > 0 ? aspect : 1;
  const halfV = THREE.MathUtils.degToRad(verticalFovDeg / 2);
  const halfH = Math.atan(Math.tan(halfV) * safeAspect);
  return radius / Math.sin(Math.min(halfV, halfH));
}

// Top-level model nodes that drive along the road, e.g. CarE0, CarW3, Truck3.
const VEHICLE_NAME = /^(Car[A-Z]+\d+|Truck\d+)$/;
const vehiclePosition = new THREE.Vector3();

// Show a vehicle only while its origin is over the ground (x/z, bounds inclusive),
// so animation paths that run past the model's edge are never seen.
export function updateVehicleVisibility(vehicles, groundBox) {
  vehicles.forEach((vehicle) => {
    vehicle.getWorldPosition(vehiclePosition);
    vehicle.visible =
      vehiclePosition.x >= groundBox.min.x &&
      vehiclePosition.x <= groundBox.max.x &&
      vehiclePosition.z >= groundBox.min.z &&
      vehiclePosition.z <= groundBox.max.z;
  });
}

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
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        // WebGL unavailable: same outcome as a failed download.
        disposeModel(gltf.scene);
        setStatus('error');
        return;
      }
      // Transparent clear so the CSS sky gradient on .FactoryScene shows through.
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

      const groundNode = gltf.scene.getObjectByName('Ground');
      const groundBox = groundNode ? new THREE.Box3().setFromObject(groundNode) : null;
      const vehicles = gltf.scene.children.filter((node) => VEHICLE_NAME.test(node.name));
      if (!groundNode) {
        console.warn('FactoryScene: model has no "Ground" node, so vehicles are not hidden off the ground.');
      }

      // Every embedded clip loops forever. Deliberately not gated on reduced motion
      // (see design.md "3D scene ignores reduced motion").
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
        if (groundBox) updateVehicleVisibility(vehicles, groundBox);
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

      // Development-only hook for browser acceptance checks; CRA strips this
      // branch from production builds.
      if (process.env.NODE_ENV !== 'production') {
        window.__FACTORY_SCENE__ = { vehicles, groundBox };
      }

      teardown = () => {
        if (process.env.NODE_ENV !== 'production') {
          delete window.__FACTORY_SCENE__;
        }
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
