// Determines which sensors detect an emergency and when they activate.
// Each sensor type maps to the emergency types it can detect.

const SENSOR_DETECTS = {
  'Fire Sensor':          ['fire'],
  'Heat Sensor':          ['fire', 'explosion'],
  'Smoke Sensor':         ['fire', 'gasLeak'],
  'Temperature Sensor':   ['fire'],
  'Gas Sensor':           ['gasLeak'],
  'Flood Sensor':         ['flood'],
  'Water Leak Sensor':    ['flood'],
  'Security Sensor':      ['riot'],
  'CCTV Coverage Sensor': ['riot'],
  'Structural Sensor':    ['explosion'],
  'Access Route Sensor':  ['fire', 'flood', 'riot', 'explosion'],
  'Power Failure Sensor': ['explosion'],
  'Air Quality Sensor':   ['fire', 'gasLeak'],
  'Humidity Sensor':      ['flood'],
};

// Seconds from the moment the hazard reaches the sensor until the sensor reports it
const SENSOR_RESPONSE_DELAY_S = {
  'Fire Sensor':          5,
  'Heat Sensor':          15,
  'Smoke Sensor':         8,
  'Temperature Sensor':   20,
  'Gas Sensor':           10,
  'Flood Sensor':         3,
  'Water Leak Sensor':    5,
  'Security Sensor':      2,
  'CCTV Coverage Sensor': 1,
  'Structural Sensor':    30,
  'Access Route Sensor':  5,
  'Power Failure Sensor': 1,
  'Air Quality Sensor':   25,
  'Humidity Sensor':      60,
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
