import * as THREE from 'three';

// Phones report 3; rendering at 2 draws 4× instead of 9× the base pixel count.
export const pixelRatio = () => Math.min(window.devicePixelRatio, 2);

// Camera distance at which a bounding sphere of `radius` fits whichever of the
// vertical and horizontal fields of view is narrower at this aspect ratio.
export function fitDistance(radius, verticalFovDeg, aspect) {
  const safeAspect = aspect > 0 ? aspect : 1;
  const halfV = THREE.MathUtils.degToRad(verticalFovDeg / 2);
  const halfH = Math.atan(Math.tan(halfV) * safeAspect);
  return radius / Math.sin(Math.min(halfV, halfH));
}

// Free GPU buffers for every geometry and material in a loaded model.
export function disposeModel(root) {
  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material && material.dispose());
  });
}
