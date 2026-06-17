import * as THREE from 'three';

export function calculateModelBoundingBox(object3d) {
  return new THREE.Box3().setFromObject(object3d);
}

// Returns plain-object dimensions in model units so they can be stored in React state.
export function calculateModelDimensions(object3d) {
  const box = calculateModelBoundingBox(object3d);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return {
    dimensions: { width: size.x, height: size.y, depth: size.z },
    center: { x: center.x, y: center.y, z: center.z },
    boundingBox: {
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
    },
    maxDimension: Math.max(size.x, size.y, size.z),
  };
}
