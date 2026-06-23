// Hostage situation simulation — for security planning and response analysis only.
// Models a contained hostage risk area from an incident point. Does not simulate violence.

import { computeSensorActivations } from './sensorActivationEngine.js';
import { estimateOccupancyImpact } from './occupancyEngine.js';

const SIMULATION_TIME_STEPS = [0, 30, 60, 120, 180, 300, 600];

const CROWD_SPEED_MPS = { Slow: 0.3, Medium: 0.8, Fast: 1.5 };

export function computeHostageFrames(config, sensors, occupancy, modelInfo, scaleFactor) {
  const duration = config.params?.durationSeconds ?? 600;
  return SIMULATION_TIME_STEPS
    .filter((t) => t <= duration)
    .map((t) => computeHostageFrame(config, sensors, occupancy, modelInfo, scaleFactor, t));
}

function computeHostageFrame(config, sensors, occupancy, modelInfo, scaleFactor, t) {
  const p = config.params ?? {};
  const sf = scaleFactor || 1;

  const hostageCount        = Number(p.hostageCount)           || 20;
  const speed            = CROWD_SPEED_MPS[p.movementSpeed] ?? CROWD_SPEED_MPS.Medium;
  const responseTimeSecs = (Number(p.securityResponseTime) || 5) * 60;

  // Raw hostage spread radius from entry point
  const rawRadius = (speed * t) / sf;

  // Security containment reduces effective spread after response time
  const securityActive  = t > responseTimeSecs;
  const incidentRadius     = securityActive ? rawRadius * 0.35 : rawRadius;

  // Core size based on hostage density (approx 0.5 m² per person)
  const coreRadius = Math.max(0.5, Math.sqrt(hostageCount * 0.5 / Math.PI) / sf);

  const impactZones = [
    { radius: Math.max(coreRadius, incidentRadius * 0.15), level: 'extreme',  label: 'Hostage location' },
    { radius: Math.max(coreRadius * 1.5, incidentRadius * 0.5), level: 'critical', label: 'Immediate danger area' },
    { radius: Math.max(coreRadius * 2, incidentRadius),          level: 'serious',  label: 'Negotiation perimeter' },
    { radius: Math.max(coreRadius * 3, incidentRadius * 1.5),    level: 'caution',  label: 'Security cordon' },
  ].filter((z) => z.radius > 0.01);

  const sensorActivations = computeSensorActivations(
    sensors, config.location, 'hostage', t, sf
  );
  const occupancyImpact = estimateOccupancyImpact(occupancy, impactZones, modelInfo, sf);

  const notes = [];
  if (t === 0) notes.push('Hostage situation reported');
  if (!securityActive && t > 60) notes.push(`Security response expected at ${Math.round(responseTimeSecs / 60)} min`);
  if (securityActive) notes.push('Security response active — hostage containment in progress');
  if (p.lockdownActive) notes.push('Lockdown protocol engaged');

  return {
    timeSeconds: t,
    impactZones,
    sensorActivations,
    occupancyImpact,
    alarmActive: sensorActivations.some((activation) => activation.status === 'Ringing'),
    scenarioType: 'hostage',
    notes,
    metrics: { incidentRadiusM: +(incidentRadius * sf).toFixed(1), securityActive },
  };
}

export function generateHostageRecommendations(frames, config, sensors) {
  const recs = [];
  const p = config.params ?? {};

  const secSensors = sensors.filter((s) =>
    (/camera/i.test(s.type) && !/thermal/i.test(s.type))
  );
  if (secSensors.length < 2) {
    recs.push({ priority: 'High', text: 'Insufficient security sensors near hostage-prone areas and controlled rooms. Add visual camera coverage with alarm beacons nearby.' });
  }
  if ((Number(p.securityResponseTime) || 5) > 5) {
    recs.push({ priority: 'Medium', text: `Security response time of ${p.securityResponseTime} min — faster response reduces affected area.` });
  }
  recs.push({ priority: 'Medium', text: 'Ensure lockdown protocols are documented and all staff are trained.' });
  recs.push({ priority: 'Low',    text: 'Review access control at hostage-prone areas and controlled rooms to reduce unauthorised entry risk.' });

  return recs;
}
