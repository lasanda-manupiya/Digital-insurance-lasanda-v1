// Determines which sensors detect an emergency and when they activate.
// Each sensor type maps to the emergency types it can detect.

const SENSOR_DETECTS = {
  'Heat Sensor - Short Range':    ['fire', 'explosion'],
  'Heat Sensor - Long Range':     ['fire', 'explosion'],
  'Thermal Camera - Short Range': ['fire', 'explosion'],
  'Thermal Camera - Long Range':  ['fire', 'explosion'],
  'Visual Camera - Short Range':  ['riot'],
  'Visual Camera - Long Range':   ['riot'],
};

// Seconds from the moment the hazard reaches the sensor until the sensor reports it
const SENSOR_RESPONSE_DELAY_S = {
  'Heat Sensor - Short Range':    8,
  'Heat Sensor - Long Range':     12,
  'Thermal Camera - Short Range': 3,
  'Thermal Camera - Long Range':  4,
  'Visual Camera - Short Range':  1,
  'Visual Camera - Long Range':   1,
};

// Approximate hazard propagation speed in metres/second for each emergency type
const SPREAD_SPEED_MPS = {
  fire:      0.5,
  explosion: 200,  // essentially instantaneous
  flood:     0.04,
  gasLeak:   0.25,
  riot:      1.2,
};

function dist3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compute activation status for every sensor at a given simulation time.
 *
 * @param {object[]} sensors        - sensor array from App state
 * @param {{x,y,z}} incidentPoint   - incident origin in model units
 * @param {string}  emergencyType   - 'fire' | 'explosion' | 'flood' | 'gasLeak' | 'riot'
 * @param {number}  timeSeconds     - elapsed simulation time
 * @param {number}  scaleFactor     - metres per model unit
 * @returns {object[]} activation records, one per sensor
 */
export function computeSensorActivations(sensors, incidentPoint, emergencyType, timeSeconds, scaleFactor = 1) {
  if (!incidentPoint) return [];

  const spreadSpeed = SPREAD_SPEED_MPS[emergencyType] ?? 0.3;

  return sensors.map((sensor) => {
    const canDetect = (SENSOR_DETECTS[sensor.type] ?? []).includes(emergencyType);
    const distModelUnits = dist3D(sensor.position, incidentPoint);
    const distMetres = distModelUnits * scaleFactor;
    const coverageM = Number(sensor.coverageRadiusMetres) || 3;
    const responseDelay = SENSOR_RESPONSE_DELAY_S[sensor.type] ?? 10;

    if (!canDetect) {
      return { sensorId: sensor.id, sensorName: sensor.name, sensorType: sensor.type,
        status: 'Unsuitable', distanceMetres: +distMetres.toFixed(1), activationTime: null };
    }

    if (distMetres > coverageM) {
      return { sensorId: sensor.id, sensorName: sensor.name, sensorType: sensor.type,
        status: 'Out of range', distanceMetres: +distMetres.toFixed(1), activationTime: null };
    }

    // Time for the hazard to reach this sensor + sensor response delay
    const timeToReach = distMetres / spreadSpeed;
    const activationTime = Math.round(timeToReach + responseDelay);

    const status = timeSeconds >= activationTime ? 'Activated' : 'Monitoring';

    return { sensorId: sensor.id, sensorName: sensor.name, sensorType: sensor.type,
      status, distanceMetres: +distMetres.toFixed(1), activationTime };
  });
}

/** Return only activated sensor records */
export function getActivatedSensors(activations) {
  return activations.filter((a) => a.status === 'Activated');
}

/** Return earliest activation time across all activated sensors, or null if none */
export function getFirstDetectionTime(activations) {
  const active = activations.filter((a) => a.activationTime !== null);
  if (active.length === 0) return null;
  return Math.min(...active.map((a) => a.activationTime));
}
