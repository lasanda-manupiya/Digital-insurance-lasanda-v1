// Determines which sensors detect an emergency and when alarm beacons ring.
// Detector devices activate when the incident is inside their coverage radius.
// Alarm beacons do not detect incidents directly; they ring after any suitable
// detector/camera confirms the incident.

import { getSensorTypeMeta } from '../data/sensorTypes.js';

// Seconds from the moment the hazard reaches the sensor until the sensor reports it.
const FAMILY_RESPONSE_DELAY_S = {
  'Heat sensor': 8,
  Camera: 1,
  Alarm: 1,
};

// Approximate hazard propagation speed in metres/second for each emergency type.
const SPREAD_SPEED_MPS = {
  fire: 0.5,
  explosion: 200,
  flood: 0.04,
  gasLeak: 0.25,
  riot: 1.2,
  hostage: 1.2,
};

function dist3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function sensorCanDetect(sensor, emergencyType) {
  const meta = getSensorTypeMeta(sensor.type);
  const isCamera = meta.family === 'Camera';
  const isThermal = isCamera && /thermal/i.test(`${sensor.type} ${meta.rangeClass ?? ''}`);
  const isVisual = isCamera && !isThermal;
  const isHeat = meta.family === 'Heat sensor';

  if (['fire', 'explosion'].includes(emergencyType)) return isHeat || isThermal;
  if (['riot', 'hostage'].includes(emergencyType)) return isVisual;
  return false;
}

function isAlarmDevice(sensor) {
  return getSensorTypeMeta(sensor.type).family === 'Alarm';
}

function buildDetectionRecord(sensor, incidentPoint, emergencyType, timeSeconds, scaleFactor) {
  const meta = getSensorTypeMeta(sensor.type);
  const distModelUnits = dist3D(sensor.position, incidentPoint);
  const distMetres = distModelUnits * scaleFactor;
  const coverageM = Number(sensor.coverageRadiusMetres) || meta.defaultRadiusMetres || 3;
  const responseDelay = meta.responseTimeSeconds ?? FAMILY_RESPONSE_DELAY_S[meta.family] ?? 10;

  if (!sensorCanDetect(sensor, emergencyType)) {
    return {
      sensorId: sensor.id,
      sensorName: sensor.name,
      sensorType: sensor.type,
      status: 'Unsuitable',
      distanceMetres: +distMetres.toFixed(1),
      activationTime: null,
    };
  }

  if (distMetres > coverageM) {
    return {
      sensorId: sensor.id,
      sensorName: sensor.name,
      sensorType: sensor.type,
      status: 'Out of range',
      distanceMetres: +distMetres.toFixed(1),
      activationTime: null,
    };
  }

  const spreadSpeed = SPREAD_SPEED_MPS[emergencyType] ?? 0.3;
  const timeToReach = distMetres / spreadSpeed;
  const activationTime = Math.round(timeToReach + responseDelay);
  const status = timeSeconds >= activationTime ? 'Activated' : 'Monitoring';

  return {
    sensorId: sensor.id,
    sensorName: sensor.name,
    sensorType: sensor.type,
    status,
    distanceMetres: +distMetres.toFixed(1),
    activationTime,
  };
}

/**
 * Compute activation status for every sensor/alarm at a given simulation time.
 *
 * @param {object[]} sensors        - sensor array from App state
 * @param {{x,y,z}} incidentPoint   - incident origin in model units
 * @param {string}  emergencyType   - 'fire' | 'explosion' | 'flood' | 'gasLeak' | 'riot' | 'hostage'
 * @param {number}  timeSeconds     - elapsed simulation time
 * @param {number}  scaleFactor     - metres per model unit
 * @returns {object[]} activation records, one per sensor/alarm
 */
export function computeSensorActivations(sensors, incidentPoint, emergencyType, timeSeconds, scaleFactor = 1) {
  if (!incidentPoint) return [];

  const detectors = sensors.filter((sensor) => !isAlarmDevice(sensor));
  const alarms = sensors.filter(isAlarmDevice);
  const detectionRecords = detectors.map((sensor) =>
    buildDetectionRecord(sensor, incidentPoint, emergencyType, timeSeconds, scaleFactor)
  );
  const firstDetection = getFirstDetectionTime(detectionRecords);

  const alarmRecords = alarms.map((sensor) => {
    const meta = getSensorTypeMeta(sensor.type);
    const alarmTime = firstDetection == null ? null : firstDetection + (meta.responseTimeSeconds ?? 1);
    const distMetres = dist3D(sensor.position, incidentPoint) * scaleFactor;
    return {
      sensorId: sensor.id,
      sensorName: sensor.name,
      sensorType: sensor.type,
      status: alarmTime != null && timeSeconds >= alarmTime ? 'Ringing' : 'Alarm ready',
      distanceMetres: +distMetres.toFixed(1),
      activationTime: alarmTime,
      alarmDevice: true,
    };
  });

  return [...detectionRecords, ...alarmRecords];
}

/** Return only active detector/alarm records */
export function getActivatedSensors(activations) {
  return activations.filter((a) => ['Activated', 'Ringing'].includes(a.status));
}

/** Return earliest activation time across all possible activations, or null if none */
export function getFirstDetectionTime(activations) {
  const active = activations.filter((a) => a.activationTime !== null && !a.alarmDevice);
  if (active.length === 0) return null;
  return Math.min(...active.map((a) => a.activationTime));
}
