// Simplified blast zone model for visualisation and planning purposes only.
// NOT a certified blast, structural, or hazardous area calculation — indicative only.

import { computeSensorActivations } from './sensorActivationEngine.js';
import { estimateOccupancyImpact } from './occupancyEngine.js';

const SIMULATION_TIME_STEPS = [0, 10, 30, 60, 120, 300, 600];

const BASE_RADII_M = {
  Low:    { inner: 3,  middle: 8,  outer: 18 },
  Medium: { inner: 6,  middle: 15, outer: 30 },
  High:   { inner: 12, middle: 28, outer: 55 },
};

const STRUCTURAL_MULT = { Low: 0.7, Medium: 1.0, High: 1.4 };

export function computeExplosionFrames(config, sensors, occupancy, modelInfo, scaleFactor) {
  const duration = config.params?.durationSeconds ?? 600;
  return SIMULATION_TIME_STEPS
    .filter((t) => t <= duration)
    .map((t) => computeExplosionFrame(config, sensors, occupancy, modelInfo, scaleFactor, t));
}

function computeExplosionFrame(config, sensors, occupancy, modelInfo, scaleFactor, t) {
  const p = config.params ?? {};
  const sf = scaleFactor || 1;

  const base      = BASE_RADII_M[p.blastIntensity]           ?? BASE_RADII_M.Medium;
  const structM   = STRUCTURAL_MULT[p.structuralVulnerability] ?? 1.0;

  const innerR  = (base.inner  * structM) / sf;
  const middleR = (base.middle * structM) / sf;
  const outerR  = (base.outer  * structM) / sf;

  // Secondary fire may develop after t = 30 s
  const secFireR = t > 30 ? innerR * 0.5 + ((t - 30) * 0.005) / sf : 0;

  const impactZones = [];
  if (secFireR > 0.01) impactZones.push({ radius: secFireR, level: 'extreme',  label: 'Secondary fire' });
  impactZones.push({ radius: innerR,       level: 'extreme',  label: 'Blast core'   });
  impactZones.push({ radius: middleR,      level: 'critical', label: 'Pressure zone' });
  impactZones.push({ radius: outerR,       level: 'serious',  label: 'Debris zone'  });
  impactZones.push({ radius: outerR * 1.4, level: 'caution',  label: 'Warning zone' });

  const sensorActivations = computeSensorActivations(
    sensors, config.location, 'explosion', t, sf
  );
  const occupancyImpact = estimateOccupancyImpact(occupancy, impactZones, modelInfo, sf);

  const notes = [];
  if (t === 0)  notes.push('Initial blast — immediate impact');
  if (t > 30 && secFireR > 0) notes.push('Secondary fire developing');
  if (t > 60)  notes.push('Do not re-enter without structural assessment');

  return {
    timeSeconds: t,
    impactZones,
    sensorActivations,
    occupancyImpact,
    alarmActive: true,
    notes,
    metrics: {
      innerRadiusM:  +(innerR  * sf).toFixed(1),
      outerRadiusM:  +(outerR  * sf).toFixed(1),
    },
  };
}

export function generateExplosionRecommendations(frames, config, sensors) {
  const recs = [];
  const p = config.params ?? {};

  if (!sensors.some((s) => s.type === 'Structural Sensor')) {
    recs.push({ priority: 'High', text: 'No structural sensors placed — blast impact on structural integrity cannot be assessed.' });
  }
  if (p.blastIntensity === 'High') {
    recs.push({ priority: 'High', text: 'High blast intensity — entire building may be affected. Plan for full evacuation.' });
  }
  recs.push({ priority: 'High',   text: 'Do not re-enter blast zone without a structural engineer sign-off.' });
  recs.push({ priority: 'Medium', text: 'Review gas shutoff and power isolation procedures for post-blast safety.' });

  return recs;
}
