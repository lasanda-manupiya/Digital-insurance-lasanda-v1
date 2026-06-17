// Simplified flood simulation for planning purposes only.
// NOT a certified hydraulic or flood risk engineering calculation — indicative only.

import { computeSensorActivations } from './sensorActivationEngine.js';
import { estimateOccupancyImpact } from './occupancyEngine.js';

const SIMULATION_TIME_STEPS = [0, 30, 60, 120, 180, 300, 600];

// Net water depth increase per minute for each inflow rate
const INFLOW_M_PER_MIN = { Low: 0.02, Medium: 0.08, High: 0.25 };

export function computeFloodFrames(config, sensors, occupancy, modelInfo, scaleFactor) {
  const duration = config.params?.durationSeconds ?? 600;
  return SIMULATION_TIME_STEPS
    .filter((t) => t <= duration)
    .map((t) => computeFloodFrame(config, sensors, occupancy, modelInfo, scaleFactor, t));
}

function computeFloodFrame(config, sensors, occupancy, modelInfo, scaleFactor, t) {
  const p = config.params ?? {};
  const sf = scaleFactor || 1;

  const initialDepth  = Number(p.initialDepth)   || 0.1;
  const inflowRateM   = INFLOW_M_PER_MIN[p.inflowRate] ?? INFLOW_M_PER_MIN.Medium;
  const drainCapacity = Number(p.drainageCapacity) || 0.01; // m/min

  const tMin = t / 60;
  const netInflow   = Math.max(0, inflowRateM - drainCapacity);
  const waterDepthM = initialDepth + netInflow * tMin;

  // Horizontal flood spread grows as water rises
  const floodRadiusM = Math.sqrt(waterDepthM * 60); // simplified
  const sf_r = (r) => r / sf;

  const impactZones = [
    { radius: sf_r(floodRadiusM * 0.25), level: 'extreme',  label: `Deep water (>${(waterDepthM * 0.8).toFixed(1)} m)` },
    { radius: sf_r(floodRadiusM * 0.55), level: 'critical', label: 'Flood zone' },
    { radius: sf_r(floodRadiusM),        level: 'serious',  label: 'Flooded area' },
    { radius: sf_r(floodRadiusM * 1.3),  level: 'caution',  label: 'At-risk zone' },
  ].filter((z) => z.radius > 0.01);

  const sensorActivations = computeSensorActivations(
    sensors, config.location, 'flood', t, sf
  );
  const occupancyImpact = estimateOccupancyImpact(occupancy, impactZones, modelInfo, sf);

  const notes = [];
  if (waterDepthM > 0.3) notes.push('Water depth >0.3 m — mobility-limited occupants at evacuation risk');
  if (waterDepthM > 1.0) notes.push('Critical water depth — serious life safety risk');
  if (netInflow < inflowRateM) notes.push('Drainage partially offsetting inflow');

  return {
    timeSeconds: t,
    impactZones,
    sensorActivations,
    occupancyImpact,
    alarmActive: waterDepthM > 0.1,
    notes,
    metrics: { waterDepthM: +waterDepthM.toFixed(2), floodRadiusM: +floodRadiusM.toFixed(1) },
  };
}

export function generateFloodRecommendations(frames, config, sensors) {
  const recs = [];
  const floodSensors = sensors.filter((s) =>
    ['Flood Sensor', 'Water Leak Sensor'].includes(s.type)
  );

  if (floodSensors.length === 0) {
    recs.push({ priority: 'High', text: 'No flood sensors placed. Install water level sensors in at-risk areas.' });
  }

  const finalDepth = frames[frames.length - 1].metrics?.waterDepthM ?? 0;
  if (finalDepth > 0.5) {
    recs.push({ priority: 'High', text: `Water depth reaches ${finalDepth.toFixed(2)} m — consider flood barriers and emergency drainage.` });
  }

  recs.push({ priority: 'Medium', text: 'Protect critical electrical equipment from flood damage — raise or relocate where possible.' });
  recs.push({ priority: 'Low',    text: 'Ensure emergency flood equipment (pumps, sandbags) is accessible.' });

  return recs;
}
