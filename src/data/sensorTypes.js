// Catalogue focused on heat sensors and camera options.
// Each type includes practical specification fields used by the UI to explain
// range, temperature limits, response behaviour, and example readings.
export const SENSOR_TYPES = [
  {
    label: 'Heat Sensor - Short Range',
    riskCategory: 'Fire',
    color: '#fb923c',
    defaultRadiusMetres: 10,
    floorBased: false,
    family: 'Heat sensor',
    rangeClass: 'Short range',
    minTemperatureC: -10,
    maxTemperatureC: 120,
    accuracyC: 1.5,
    responseTimeSeconds: 8,
    attenuationPerMetre: 0.035,
    guidance: 'Use close to likely heat sources: electrical panels, small plant rooms, kitchens, and machinery bays.',
  },
  {
    label: 'Heat Sensor - Long Range',
    riskCategory: 'Fire',
    color: '#f97316',
    defaultRadiusMetres: 25,
    floorBased: false,
    family: 'Heat sensor',
    rangeClass: 'Long range',
    minTemperatureC: -20,
    maxTemperatureC: 200,
    accuracyC: 2,
    responseTimeSeconds: 12,
    attenuationPerMetre: 0.022,
    guidance: 'Use for larger plant rooms, warehouses, generator rooms, and open industrial spaces.',
  },
  {
    label: 'Thermal Camera - Short Range',
    riskCategory: 'Fire',
    color: '#fbbf24',
    defaultRadiusMetres: 15,
    floorBased: false,
    family: 'Camera',
    rangeClass: 'Short range thermal',
    minTemperatureC: -20,
    maxTemperatureC: 150,
    accuracyC: 2,
    responseTimeSeconds: 3,
    fieldOfViewDegrees: 70,
    resolution: '320 × 240 thermal',
    attenuationPerMetre: 0.025,
    guidance: 'Use where the camera needs to see the asset directly: server rooms, panels, short corridors, and compact process areas.',
  },
  {
    label: 'Thermal Camera - Long Range',
    riskCategory: 'Fire',
    color: '#ef4444',
    defaultRadiusMetres: 40,
    floorBased: false,
    family: 'Camera',
    rangeClass: 'Long range thermal',
    minTemperatureC: -20,
    maxTemperatureC: 300,
    accuracyC: 3,
    responseTimeSeconds: 4,
    fieldOfViewDegrees: 45,
    resolution: '640 × 480 thermal',
    attenuationPerMetre: 0.014,
    guidance: 'Use for long aisles, warehouses, perimeter heat monitoring, and large open halls where line-of-sight is available.',
  },
  {
    label: 'Visual Camera - Short Range',
    riskCategory: 'Security',
    color: '#818cf8',
    defaultRadiusMetres: 12,
    floorBased: false,
    family: 'Camera',
    rangeClass: 'Short range visual',
    responseTimeSeconds: 1,
    fieldOfViewDegrees: 90,
    resolution: '1080p visible light',
    guidance: 'Use for doors, counters, close corridors, and indoor areas where visual verification is needed.',
  },
  {
    label: 'Visual Camera - Long Range',
    riskCategory: 'Security',
    color: '#6366f1',
    defaultRadiusMetres: 35,
    floorBased: false,
    family: 'Camera',
    rangeClass: 'Long range visual',
    responseTimeSeconds: 1,
    fieldOfViewDegrees: 35,
    resolution: '4 MP visible light',
    guidance: 'Use for car parks, perimeter lines, loading bays, and long corridors where zoomed visual coverage is required.',
  },
];

export const SENSITIVITY_LEVELS = ['Low', 'Medium', 'High'];
export const SENSOR_STATUSES = ['Planned', 'Virtual', 'Installed', 'Inactive'];
export const INSTALLATION_PRIORITIES = ['Low', 'Medium', 'High'];

export function getSensorTypeMeta(label) {
  return SENSOR_TYPES.find((t) => t.label === label) || SENSOR_TYPES[0];
}

export function isHeatDetectionType(label) {
  const meta = getSensorTypeMeta(label);
  return meta.family === 'Heat sensor' || label.startsWith('Thermal Camera');
}

export function estimateDetectedTemperature(meta, sourceTemperatureC, distanceMetres, ambientTemperatureC = 22) {
  const source = Number(sourceTemperatureC);
  const distance = Math.max(0, Number(distanceMetres) || 0);
  const ambient = Number(ambientTemperatureC);

  if (!Number.isFinite(source) || !Number.isFinite(ambient) || meta.maxTemperatureC === undefined) {
    return null;
  }

  if (distance > meta.defaultRadiusMetres) {
    return { inRange: false, detectedTemperatureC: ambient, deltaFromAmbientC: 0 };
  }

  const attenuation = Math.exp(-(meta.attenuationPerMetre ?? 0.03) * distance);
  const detected = ambient + ((source - ambient) * attenuation);
  const clamped = Math.min(meta.maxTemperatureC, Math.max(meta.minTemperatureC, detected));

  return {
    inRange: true,
    detectedTemperatureC: +clamped.toFixed(1),
    deltaFromAmbientC: +(clamped - ambient).toFixed(1),
  };
}
