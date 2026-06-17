// Scale conversion helpers. scaleFactor = metres per model unit.
// realDistanceMetres = modelDistanceUnits * scaleFactor
// modelDistanceUnits = realDistanceMetres / scaleFactor

export function convertMetresToModelUnits(metres, scaleFactor) {
  if (!scaleFactor) return 0;
  return metres / scaleFactor;
}

export function convertModelUnitsToMetres(modelUnits, scaleFactor) {
  return modelUnits * scaleFactor;
}

// pointA / pointB: {x, y, z} in model units. Returns metres.
export function calculateDistanceBetweenPoints(pointA, pointB, scaleFactor = 1) {
  const dx = pointB.x - pointA.x;
  const dy = pointB.y - pointA.y;
  const dz = pointB.z - pointA.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) * scaleFactor;
}

export function calculateScaleFactorFromKnownDistance(modelDistanceUnits, realDistanceMetres) {
  if (!modelDistanceUnits) return 1;
  return realDistanceMetres / modelDistanceUnits;
}
