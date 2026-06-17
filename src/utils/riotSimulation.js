// Riot / unauthorised entry simulation — for security planning and response analysis only.
// Models crowd spread from an entry point. Does not simulate violence.

import { computeSensorActivations } from './sensorActivationEngine.js';
import { estimateOccupancyImpact } from './occupancyEngine.js';

const SIMULATION_TIME_STEPS = [0, 30, 60, 120, 180, 300, 600];

const CROWD_SPEED_MPS = { Slow: 0.3, Medium: 0.8, Fast: 1.5 };

export function computeRiotFrames(config, sensors, occupancy, modelInfo, scaleFactor) {
  const duration = config.params?.durationSeconds ?? 600;
  return SIMULATION_TIME_STEPS
    .filter((t) => t <= duration)
    .map((t) => computeRiotFrame(config, sensors, occupancy, modelInfo, scaleFactor, t));
}

function computeRiotFrame(config, sensors, occupancy, modelInfo, scaleFactor, t) {
  const p = config.params ?? {};
  const sf = scaleFactor || 1;

  const crowdSize        = Number(p.crowdSize)           || 20;
  const speed            = CROWD_SPEED_MPS[p.movementSpeed] ?? CROWD_SPEED_MPS.Medium;
  const responseTimeSecs = (Number(p.securityResponseTime) || 5) * 60;

  // Raw crowd spread radius from entry point
  const rawRadius = (speed * t) / sf;

  // Security containment reduces effective spread after response time
  const securityActive  = t > responseTimeSecs;
  const crowdRadius     = securityActive ? rawRadius * 0.35 : rawRadius;

  // Core size based on crowd density (approx 0.5 m² per person)
  const coreRadius = Math.max(0.5, Math.sqrt(crowdSize * 0.5 / Math.PI) / sf);

  const impactZones = [
    { radius: Math.max(coreRadius, crowdRadius * 0.15), level: 'extreme',  label: 'Crowd core' },
    { radius: Math.max(coreRadius * 1.5, crowdRadius * 0.5), level: 'critical', label: 'Active area' },
    { radius: Math.max(coreRadius * 2, crowdRadius),          level: 'serious',  label: 'Affected zone' },
    { radius: Math.max(coreRadius * 3, crowdRadius * 1.5),    level: 'caution',  label: 'Warning zone' },
  ].filter((z) => z.radius > 0.01);

  const sensorActivations = computeSensorActivations(
    sensors, config.location, 'riot', t, sf
  );
  const occupancyImpact = estimateOccupancyImpact(occupancy, impactZones, modelInfo, sf);

  const notes = [];
  if (t === 0) notes.push('Unauthorised entry detected');
  if (!securityActive && t > 60) notes.push(`Security response expected at ${Math.round(responseTimeSecs / 60)} min`);
  if (securityActive) notes.push('Security response active — crowd containment in progress');
  if (p.lockdownActive) notes.push('Lockdown protocol engaged');

  return {
    timeSeconds: t,
    impactZones,
    sensorActivations,
    occupancyImpact,
    alarmActive: t > 15,
    notes,
    metrics: { crowdRadiusM: +(crowdRadius * sf).toFixed(1), securityActive },
  };
}

export function generateRiotRecommendations(frames, config, sensors) {
  const recs = [];
  const p = config.params ?? {};

  const secSensors = sensors.filter((s) =>
    s.type.startsWith('Visual Camera')
  );
  if (secSensors.length < 2) {
    recs.push({ priority: 'High', text: 'Insufficient security sensors near entry points. Add visual camera coverage.' });
  }
  if ((Number(p.securityResponseTime) || 5) > 5) {
    recs.push({ priority: 'Medium', text: `Security response time of ${p.securityResponseTime} min — faster response reduces affected area.` });
  }
  recs.push({ priority: 'Medium', text: 'Ensure lockdown protocols are documented and all staff are trained.' });
  recs.push({ priority: 'Low',    text: 'Review access control at entry points to reduce unauthorised entry risk.' });

  return recs;
}
