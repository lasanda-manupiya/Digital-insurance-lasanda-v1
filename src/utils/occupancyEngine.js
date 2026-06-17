// Simplified occupancy impact calculator.
// Without real room geometry, we estimate impact from zone areas vs building footprint.

export const DEFAULT_OCCUPANCY = {
  totalPeople: 50,
  mobilityLimited: 2,
  visitors: 10,
  staff: 40,
  averageMovementSpeed: 1.2, // metres per second
  floors: {},
};

/**
 * Estimate how many occupants fall within each impact zone at a given simulation frame.
 *
 * @param {object} occupancy    - occupancy configuration
 * @param {object[]} impactZones - [{radius (model units), level}]
 * @param {object|null} modelInfo - {dimensions:{width,depth}} in model units
 * @param {number} scaleFactor  - metres per model unit
 */
export function estimateOccupancyImpact(occupancy, impactZones, modelInfo, scaleFactor = 1) {
  const totalPeople = Number(occupancy?.totalPeople) || 50;

  if (!impactZones || impactZones.length === 0) {
    return { totalAffected: 0, inCritical: 0, inSerious: 0, inCaution: 0,
      inSafe: totalPeople, evacuating: 0, trapped: 0, requiresAssistance: 0 };
  }

  // Approximate building floor area in square metres
  const buildingAreaM2 = modelInfo
    ? (modelInfo.dimensions.width * scaleFactor) * (modelInfo.dimensions.depth * scaleFactor)
    : 400; // fallback: assume 20×20 m

  // Outermost zone gives the total affected footprint
  const outerZone = impactZones[impactZones.length - 1];
  const outerAreaM2 = Math.PI * (outerZone.radius * scaleFactor) ** 2;
  const affectedFraction = Math.min(outerAreaM2 / buildingAreaM2, 1);
  const totalAffected = Math.round(totalPeople * affectedFraction);

  // Distribute across zones (each ring is the area between successive radii)
  function peopleInZone(level) {
    const idx = impactZones.findIndex((z) => z.level === level);
    if (idx < 0) return 0;
    const r = impactZones[idx].radius * scaleFactor;
    const prevR = idx > 0 ? impactZones[idx - 1].radius * scaleFactor : 0;
    const ringArea = Math.PI * (r ** 2 - prevR ** 2);
    return Math.round((ringArea / buildingAreaM2) * totalPeople);
  }

  const inCritical = Math.max(0, peopleInZone('critical') + peopleInZone('extreme'));
  const inSerious  = Math.max(0, peopleInZone('serious'));
  const inCaution  = Math.max(0, peopleInZone('caution'));
  const inSafe     = Math.max(0, totalPeople - totalAffected);

  const mobilityLimited = Number(occupancy?.mobilityLimited) || 0;
  const requiresAssistance = Math.min(mobilityLimited, inCritical + inSerious);
  const trapped = Math.max(0, Math.round(inCritical * 0.08)); // 8% of critical zone may be delayed

  return {
    totalAffected,
    inCritical,
    inSerious,
    inCaution,
    inSafe,
    evacuating: Math.max(0, totalAffected - trapped),
    trapped,
    requiresAssistance,
  };
}

export function generateOccupancyRecommendations(impact, occupancy) {
  const recs = [];
  if (impact.trapped > 0) {
    recs.push(`${impact.trapped} person(s) may require rescue assistance.`);
  }
  if (impact.requiresAssistance > 0) {
    recs.push(`${impact.requiresAssistance} mobility-limited occupant(s) need evacuation assistance.`);
  }
  if (impact.inCritical > 10) {
    recs.push('Large number of people in critical zones — immediate evacuation essential.');
  }
  return recs;
}
