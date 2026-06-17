// Simplified rule-based fire spread simulation.
// Uses a modified t-squared fire growth model for illustration.
// NOT a certified fire engineering calculation — indicative only.

import { computeSensorActivations } from './sensorActivationEngine.js';
import { estimateOccupancyImpact } from './occupancyEngine.js';

const SIMULATION_TIME_STEPS = [0, 30, 60, 120, 180, 300, 600];

// Alpha values (heat release rate growth) simplified from BS PD 7974
const GROWTH_RATE_ALPHA = {
  Slow:         0.002,
  Medium:       0.012,
  Fast:         0.047,
  'Ultra-fast': 0.188,
};

const INTENSITY_MULT = { Low: 0.6, Medium: 1.0, High: 1.6 };
const SMOKE_MULT     = { Low: 1.4, Medium: 2.0, High: 3.2 };

export function computeFireFrames(config, sensors, occupancy, modelInfo, scaleFactor) {
  const duration = config.params?.durationSeconds ?? 600;
  return SIMULATION_TIME_STEPS
    .filter((t) => t <= duration)
    .map((t) => computeFireFrame(config, sensors, occupancy, modelInfo, scaleFactor, t));
}

function computeFireFrame(config, sensors, occupancy, modelInfo, scaleFactor, t) {
  const p = config.params ?? {};
  const sf = scaleFactor || 1;

  const alpha    = GROWTH_RATE_ALPHA[p.growthRate]    ?? GROWTH_RATE_ALPHA.Medium;
  const iMult    = INTENSITY_MULT[p.fireIntensity]    ?? 1.0;
  const sMult    = SMOKE_MULT[p.smokeProduction]      ?? 2.0;
  const doorMult = p.doorsOpen !== false ? 1.35 : 1.0;
  const ventMult = p.ventilationActive !== false ? 1.15 : 1.0;

  // Sprinklers activate at 120 s and suppress growth by 75 %
  let effectiveT = t;
  if (p.sprinklersAvailable && t > 120) {
    effectiveT = 120 + (t - 120) * 0.25;
  }

  // Fire area from t² model → radius in metres
  const heatReleaseMW = alpha * iMult * effectiveT * effectiveT;
  const fireRadiusM   = Math.max(0.3, Math.sqrt(heatReleaseMW / (Math.PI * 0.25)));
  const smokeRadiusM  = fireRadiusM * sMult * doorMult * ventMult;

  // Convert to model units for 3D rendering
  const impactZones = [
    { radius: (fireRadiusM * 0.4) / sf, level: 'extreme',  label: 'Fire core' },
    { radius: fireRadiusM / sf,         level: 'critical', label: 'Fire zone' },
    { radius: (smokeRadiusM * 0.5) / sf, level: 'serious', label: 'Dense smoke' },
    { radius: smokeRadiusM / sf,        level: 'caution',  label: 'Smoke warning' },
  ].filter((z) => z.radius > 0.01);

  const sensorActivations = computeSensorActivations(
    sensors, config.location, 'fire', t, sf
  );
  const occupancyImpact = estimateOccupancyImpact(occupancy, impactZones, modelInfo, sf);

  const alarmActive = p.alarmAvailable !== false && t >= 20;

  const notes = [];
  if (p.sprinklersAvailable && t > 120) notes.push('Sprinkler suppression active');
  if (alarmActive) notes.push('Fire alarm activated');
  if (p.doorsOpen !== false && t > 60) notes.push('Open doors accelerating smoke spread');

  return {
    timeSeconds: t,
    impactZones,
    sensorActivations,
    occupancyImpact,
    alarmActive,
    notes,
    metrics: {
      fireRadiusM:  +fireRadiusM.toFixed(2),
      smokeRadiusM: +smokeRadiusM.toFixed(2),
    },
  };
}

export function generateFireRecommendations(frames, config, sensors) {
  const finalFrame = frames[frames.length - 1];
  const recs = [];
  const p = config.params ?? {};

  const fireSensors = sensors.filter((s) =>
    ['Fire Sensor', 'Heat Sensor', 'Smoke Sensor', 'Temperature Sensor'].includes(s.type)
  );
  if (fireSensors.length === 0) {
    recs.push({ priority: 'High', text: 'No fire detection sensors placed. Install heat and smoke detectors.' });
  }

  const activated = finalFrame.sensorActivations.filter((a) => a.status === 'Activated');
  if (fireSensors.length > 0 && activated.length === 0) {
    recs.push({ priority: 'High', text: 'No sensors within detection range of the incident location. Review placement.' });
  }

  if (!p.sprinklersAvailable) {
    recs.push({ priority: 'Medium', text: 'No sprinkler system configured — sprinklers significantly slow fire spread.' });
  }
  if (p.alarmAvailable === false) {
    recs.push({ priority: 'High', text: 'No alarm system configured — early warning is critical for safe evacuation.' });
  }
  if (p.doorsOpen !== false) {
    recs.push({ priority: 'Low', text: 'Open doors accelerate smoke spread. Consider fire door compartmentalisation.' });
  }

  const finalSmoke = finalFrame.metrics?.smokeRadiusM ?? 0;
  if (finalSmoke > 15) {
    recs.push({ priority: 'High', text: `Smoke reaches ${finalSmoke.toFixed(0)} m at simulation end — confirm all exits remain outside the smoke zone.` });
  }

  return recs;
}
