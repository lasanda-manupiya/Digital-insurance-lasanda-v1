// Simple rule based coverage estimation.
// Coverage area per sensor = pi * r^2 (treated as a floor footprint).
// This deliberately ignores overlaps and walls — good enough for the MVP.

export function calculateSensorCoverageArea(sensor) {
  const r = Number(sensor.coverageRadiusMetres) || 0;
  return Math.PI * r * r;
}

export function calculateTotalCoverageArea(sensors, sensorType = 'All') {
  return sensors
    .filter((s) => sensorType === 'All' || s.type === sensorType)
    .reduce((sum, s) => sum + calculateSensorCoverageArea(s), 0);
}

export function calculateCoveragePercentage(totalCoverageArea, requiredArea) {
  if (!requiredArea || requiredArea <= 0) return 0;
  return (totalCoverageArea / requiredArea) * 100;
}

export function calculateCoverageStatus(coveragePercentage) {
  if (coveragePercentage <= 40) return 'Poor coverage';
  if (coveragePercentage <= 70) return 'Partial coverage';
  if (coveragePercentage <= 90) return 'Good coverage';
  return 'Strong coverage';
}

export function estimateAdditionalSensorsNeeded(requiredArea, coveredArea, averageSensorCoverageArea) {
  if (!averageSensorCoverageArea || averageSensorCoverageArea <= 0) return 0;
  const remaining = Math.max(0, requiredArea - coveredArea);
  return Math.ceil(remaining / averageSensorCoverageArea);
}

// Simple textual gap analysis — the MVP has no room boundary detection,
// so gaps are reported as observations rather than geometric regions.
export function identifyCoverageGaps(sensors, selectedZone, sensorType = 'All') {
  const gaps = [];
  const filtered = sensors.filter((s) => sensorType === 'All' || s.type === sensorType);
  if (filtered.length === 0) {
    gaps.push(
      sensorType === 'All'
        ? 'No sensors have been placed yet.'
        : `No ${sensorType} has been placed yet.`
    );
    return gaps;
  }
  if (selectedZone) {
    const inZone = filtered.filter(
      (s) => (s.linkedZone || '').trim().toLowerCase() === selectedZone.trim().toLowerCase()
    );
    if (inZone.length === 0) {
      gaps.push(`No sensors are linked to zone "${selectedZone}". Set the Linked zone field on relevant sensors.`);
    }
  }
  const hidden = filtered.filter((s) => !s.coverageVisible);
  if (hidden.length > 0) {
    gaps.push(`${hidden.length} sensor(s) have coverage visibility switched off.`);
  }
  return gaps;
}

export function recommendAdditionalSensors(sensorType, coveragePercentage) {
  if (coveragePercentage > 90) {
    return 'Coverage is strong. Maintain sensor positions and verify against the real installation.';
  }
  const placementHints = {
    'Flood Sensor': 'low level areas, basement areas, drainage points and water entry points',
    'Water Leak Sensor': 'pipe runs, risers, tanks and wet plant areas',
    'Heat Sensor': 'plant rooms, electrical rooms, boiler rooms, server rooms and machinery areas',
    'Smoke Sensor': 'escape routes, enclosed rooms, corridors and high risk fire zones',
    'Security Sensor': 'entrances, loading bays, blind spots and external access points',
    'CCTV Coverage Sensor': 'entrances, perimeters, loading bays and blind spots',
    'Structural Sensor': 'beams, columns, roof structure and high load zones',
    'Access Route Sensor': 'evacuation paths, exits, stairwells and corridors',
  };
  const hint = placementHints[sensorType] || 'the least covered parts of the zone';
  if (coveragePercentage <= 40) {
    return `Coverage is poor. Add more sensors focusing on ${hint}, or increase sensor range if technically valid.`;
  }
  if (coveragePercentage <= 70) {
    return `Coverage is partial. Add at least one more sensor near ${hint}, spaced away from existing sensors.`;
  }
  return `Coverage is good but not complete. Consider one additional sensor covering ${hint}.`;
}
