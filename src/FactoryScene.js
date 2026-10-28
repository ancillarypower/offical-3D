import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

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

// Clickable buildings. Each is a set of sibling nodes directly under the model root,
// matched by name (see design.md "Buildings are defined by a name table").
export const BUILDINGS = [
  { id: 'Office', label: 'Office', parts: /^(Office(Roof|Canopy|Entrance|Solar\d+)?|OffWin[FS]\d+_\d+)$/ },
  { id: 'GuardHouse', label: 'Guard House', parts: /^GuardHouse(Win)?$/ },
];

// The building under the first visible raycast hit, or null. Raycaster ignores
// `visible`, so hidden objects (e.g. vehicles off the ground) are skipped here.
export function pickBuilding(intersections, modelRoot, buildings) {
  for (const { object } of intersections) {
    let top = object;
    let visible = object.visible;
    while (top.parent && top.parent !== modelRoot) {
      top = top.parent;
      visible = visible && top.visible;
    }
    if (!visible) continue;
    return buildings.find((building) => building.parts.test(top.name)) || null;
  }
  return null;
}

// A focused building is viewed from its road-facing (+z) side, slightly right and above,
// at FOCUS_MARGIN × the distance that just fits its bounding sphere.
export const FOCUS_DIRECTION = new THREE.Vector3(0.35, 0.45, 1).normalize();
const FOCUS_MARGIN = 1.2;
const FLIGHT_SECONDS = 1;
// A press and release further apart than this is an orbit drag, not a click.
const CLICK_SLOP_PX = 5;

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

      // Clickable buildings present in this model, with their static world bounds.
      const buildings = BUILDINGS.map((building) => {
        const parts = gltf.scene.children.filter((node) => building.parts.test(node.name));
        if (parts.length === 0) return null;
        const bounds = new THREE.Box3();
        parts.forEach((part) => bounds.expandByObject(part));
        return {
          ...building,
          box: bounds,
          centre: bounds.getCenter(new THREE.Vector3()),
          radius: bounds.getSize(new THREE.Vector3()).length() / 2,
        };
      }).filter(Boolean);

      // Building names as DOM labels anchored above each building; the layer lets
      // clicks and drags through to the canvas.
      const labelRenderer = new CSS2DRenderer();
      labelRenderer.setSize(width, height);
      Object.assign(labelRenderer.domElement.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        pointerEvents: 'none',
      });
      mount.appendChild(labelRenderer.domElement);
      buildings.forEach((building) => {
        const element = document.createElement('div');
        element.className = 'FactoryScene-label';
        element.textContent = building.label;
        // CSS2DRenderer would only attach it on first show; attach it hidden up front.
        element.style.display = 'none';
        labelRenderer.domElement.appendChild(element);
        building.labelObject = new CSS2DObject(element);
        building.labelObject.position.set(building.centre.x, building.box.max.y + 1, building.centre.z);
        building.labelObject.visible = false;
        scene.add(building.labelObject);
      });
      const hideLabels = () => buildings.forEach((building) => (building.labelObject.visible = false));

      let focusedId = null;
      let overviewPose = null;
      let flight = null;

      // Swing the camera around a moving target: the target travels in a straight line
      // while the offset to the camera is interpolated in spherical coordinates, so the
      // path never cuts through the model (design.md "Flight path").
      const fly = (toPosition, toTarget, onArrive) => {
        // update() clamps distance even while disabled, and leftover damping would
        // keep rotating after the flight; flush it and lift the zoom-in limit.
        controls.autoRotate = false;
        controls.enableDamping = false;
        controls.update();
        controls.enableDamping = true;
        controls.enabled = false;
        controls.minDistance = 0;

        const fromTarget = controls.target.clone();
        const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(fromTarget));
        const to = new THREE.Spherical().setFromVector3(toPosition.clone().sub(toTarget));
        const turn = Math.atan2(Math.sin(to.theta - from.theta), Math.cos(to.theta - from.theta));
        const offset = new THREE.Spherical();
        const toOffset = new THREE.Vector3();
        const progress = { t: 0 };
        flight = gsap.to(progress, {
          t: 1,
          duration: FLIGHT_SECONDS,
          ease: 'power2.inOut',
          onUpdate: () => {
            const { t } = progress;
            // Re-read the destination: a resize mid-flight rescales the overview pose.
            to.setFromVector3(toOffset.subVectors(toPosition, toTarget));
            controls.target.lerpVectors(fromTarget, toTarget, t);
            offset.set(
              THREE.MathUtils.lerp(from.radius, to.radius, t),
              THREE.MathUtils.lerp(from.phi, to.phi, t),
              from.theta + turn * t,
            );
            camera.position.setFromSpherical(offset).add(controls.target);
          },
          onComplete: () => {
            flight = null;
            controls.enabled = true;
            onArrive();
          },
        });
      };

      const focusOn = (building) => {
        if (!overviewPose) {
          overviewPose = { position: camera.position.clone(), target: controls.target.clone() };
        }
        const distance = fitDistance(building.radius, camera.fov, camera.aspect) * FOCUS_MARGIN;
        const position = building.centre.clone().addScaledVector(FOCUS_DIRECTION, distance);
        hideLabels();
        fly(position, building.centre, () => {
          focusedId = building.id;
          controls.minDistance = building.radius;
          building.labelObject.visible = true;
        });
      };

      const returnToOverview = () => {
        const pose = overviewPose;
        hideLabels();
        fly(pose.position, pose.target, () => {
          focusedId = null;
          overviewPose = null;
          controls.minDistance = radius;
          controls.autoRotate = true;
        });
      };

      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();
      const buildingAt = (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        pointerNdc.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        camera.updateMatrixWorld();
        raycaster.setFromCamera(pointerNdc, camera);
        return pickBuilding(raycaster.intersectObject(gltf.scene, true), gltf.scene, buildings);
      };

      const handleClick = (event) => {
        if (flight) return;
        const building = buildingAt(event);
        if (building) {
          if (building.id !== focusedId) focusOn(building);
        } else if (focusedId) {
          returnToOverview();
        }
      };

      const handleKeyDown = (event) => {
        if (event.key === 'Escape' && focusedId && !flight) returnToOverview();
      };
      window.addEventListener('keydown', handleKeyDown);

      // A click is one primary-button press released in place. A second finger
      // (pinch) cancels the pending click until every pointer is up again.
      let press = null;
      const pointersDown = new Set();
      const handlePointerDown = (event) => {
        pointersDown.add(event.pointerId);
        press = pointersDown.size === 1 && event.button === 0
          ? { id: event.pointerId, x: event.clientX, y: event.clientY }
          : null;
      };
      const handlePointerUp = (event) => {
        pointersDown.delete(event.pointerId);
        const start = press;
        press = null;
        if (!start || start.id !== event.pointerId) return;
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP_PX) return;
        handleClick(event);
      };
      const handlePointerCancel = (event) => {
        pointersDown.delete(event.pointerId);
        press = null;
      };
      // Hand cursor over a clickable building; skipped while a button is held (dragging).
      const handlePointerMove = (event) => {
        if (event.buttons !== 0) return;
        renderer.domElement.style.cursor = buildingAt(event) ? 'pointer' : '';
      };
      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      renderer.domElement.addEventListener('pointerup', handlePointerUp);
      renderer.domElement.addEventListener('pointercancel', handlePointerCancel);
      renderer.domElement.addEventListener('pointermove', handlePointerMove);

      let frameId;
      const animate = () => {
        timer.update();
        mixer.update(timer.getDelta());
        if (groundBox) updateVehicleVisibility(vehicles, groundBox);
        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
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
        labelRenderer.setSize(w, h);
        camera.aspect = w / h;
        const nextFit = fitDistance(radius, camera.fov, camera.aspect);
        if (overviewPose) {
          // Focused or flying: keep the camera on the building and re-fit the
          // overview it will return to instead.
          const offset = overviewPose.position.clone().sub(overviewPose.target);
          overviewPose.position.copy(overviewPose.target).addScaledVector(offset, nextFit / fit);
        } else {
          const offset = camera.position.clone().sub(controls.target);
          camera.position.copy(controls.target).addScaledVector(offset, nextFit / fit);
        }
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
        window.__FACTORY_SCENE__ = {
          vehicles,
          groundBox,
          camera,
          controls,
          buildings: buildings.map(({ id, label, box }) => ({ id, label, box })),
          getFocus: () => ({ focusedId, flying: flight !== null }),
        };
      }

      teardown = () => {
        if (process.env.NODE_ENV !== 'production') {
          delete window.__FACTORY_SCENE__;
        }
        cancelAnimationFrame(frameId);
        if (flight) flight.kill();
        window.removeEventListener('keydown', handleKeyDown);
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
        renderer.domElement.removeEventListener('pointerup', handlePointerUp);
        renderer.domElement.removeEventListener('pointercancel', handlePointerCancel);
        renderer.domElement.removeEventListener('pointermove', handlePointerMove);
        resizeObserver.disconnect();
        buildings.forEach((building) => scene.remove(building.labelObject));
        labelRenderer.domElement.remove();
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
