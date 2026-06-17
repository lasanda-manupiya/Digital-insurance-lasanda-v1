// Simplified gas leak dispersion model for planning purposes only.
// NOT a certified gas dispersion, hazardous area, or ATEX calculation — indicative only.

import { computeSensorActivations } from './sensorActivationEngine.js';
import { estimateOccupancyImpact } from './occupancyEngine.js';

const SIMULATION_TIME_STEPS = [0, 30, 60, 120, 180, 300, 600];

const LEAK_SPEED_MPS = { Low: 0.10, Medium: 0.30, High: 0.65 };
const VENT_FACTOR    = { None: 1.0, Poor: 0.85, Normal: 0.55, Good: 0.30 };

export function computeGasLeakFrames(config, sensors, occupancy, modelInfo, scaleFactor) {
  const duration = config.params?.durationSeconds ?? 600;
  return SIMULATION_TIME_STEPS
    .filter((t) => t <= duration)
    .map((t) => computeGasLeakFrame(config, sensors, occupancy, modelInfo, scaleFactor, t));
}

function computeGasLeakFrame(config, sensors, occupancy, modelInfo, scaleFactor, t) {
  const p = config.params ?? {};
  const sf = scaleFactor || 1;

  const speed   = LEAK_SPEED_MPS[p.leakRate]            ?? LEAK_SPEED_MPS.Medium;
  const vent    = VENT_FACTOR[p.ventilationCondition]    ?? VENT_FACTOR.Normal;

  // Cloud grows with time, moderated by ventilation
  const cloudRadiusM   = speed * t * vent;
  const hazardRadiusM  = cloudRadiusM * 0.35; // explosive / toxic concentration
  const warningRadiusM = cloudRadiusM * 0.65;

  const sf_r = (r) => r / sf;

  const impactZones = [
    { radius: sf_r(Math.max(0.5, hazardRadiusM * 0.5)), level: 'extreme',  label: 'Explosive/toxic concentration' },
    { radius: sf_r(Math.max(1.0, hazardRadiusM)),        level: 'critical', label: 'Hazardous zone' },
    { radius: sf_r(Math.max(2.0, warningRadiusM)),       level: 'serious',  label: 'Warning concentration' },
    { radius: sf_r(Math.max(3.0, cloudRadiusM)),         level: 'caution',  label: 'Detectable gas' },
  ].filter((z) => z.radius > 0.01);

  const sensorActivations = computeSensorActivations(
    sensors, config.location, 'gasLeak', t, sf
  );
  const occupancyImpact = estimateOccupancyImpact(occupancy, impactZones, modelInfo, sf);

  const notes = [];
  if (p.gasType) notes.push(`Gas type: ${p.gasType}`);
  if (vent <= 0.35) notes.push('Good ventilation reducing spread');
  if (vent >= 0.85) notes.push('Poor ventilation — gas accumulating');
  if (hazardRadiusM > 5) notes.push('Ignition hazard — eliminate all ignition sources');

  return {
    timeSeconds: t,
    impactZones,
    sensorActivations,
    occupancyImpact,
    alarmActive: t > 30,
    notes,
    metrics: {
      cloudRadiusM:  +cloudRadiusM.toFixed(1),
      hazardRadiusM: +hazardRadiusM.toFixed(1),
    },
  };
}

export function generateGasLeakRecommendations(frames, config, sensors) {
  const recs = [];
  const p = config.params ?? {};

  if (!sensors.some((s) => ['Gas Sensor', 'Air Quality Sensor'].includes(s.type))) {
    recs.push({ priority: 'High', text: 'No gas or air quality sensors placed. Install gas detectors near source location.' });
  }

  recs.push({ priority: 'High', text: 'Eliminate all ignition sources immediately. Do not operate electrical switches in affected zone.' });

  if (['None', 'Poor'].includes(p.ventilationCondition)) {
    recs.push({ priority: 'High', text: 'Poor ventilation detected — improve airflow to reduce gas accumulation.' });
  }

  recs.push({ priority: 'Medium', text: 'Evacuate all personnel from the affected zone and contact the gas emergency service.' });
  recs.push({ priority: 'Low',    text: 'Identify and isolate the gas supply at the nearest shutoff valve.' });

  return recs;
}
