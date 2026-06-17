// Catalogue of virtual sensor types available in the demo.
// color is used for the marker and coverage zone, defaultRadiusMetres seeds new sensors,
// floorBased sensors additionally draw a flat coverage circle on the floor.
export const SENSOR_TYPES = [
  { label: 'Flood Sensor', riskCategory: 'Flood', color: '#38bdf8', defaultRadiusMetres: 3, floorBased: true, guidance: 'Low level areas, basements, drainage points, water entry points.' },
  { label: 'Fire Sensor', riskCategory: 'Fire', color: '#f87171', defaultRadiusMetres: 4, floorBased: false, guidance: 'High risk fire zones, storage areas, kitchens.' },
  { label: 'Heat Sensor', riskCategory: 'Fire', color: '#fb923c', defaultRadiusMetres: 2, floorBased: false, guidance: 'Plant rooms, electrical rooms, boiler rooms, server rooms, machinery.' },
  { label: 'Temperature Sensor', riskCategory: 'Fire', color: '#fbbf24', defaultRadiusMetres: 3, floorBased: false, guidance: 'Server rooms, plant rooms, cold storage.' },
  { label: 'Smoke Sensor', riskCategory: 'Fire', color: '#9ca3af', defaultRadiusMetres: 5, floorBased: false, guidance: 'Escape routes, enclosed rooms, corridors, high risk fire zones.' },
  { label: 'Security Sensor', riskCategory: 'Security', color: '#a78bfa', defaultRadiusMetres: 6, floorBased: false, guidance: 'Entrances, loading bays, blind spots, external access points.' },
  { label: 'Structural Sensor', riskCategory: 'Structural', color: '#f472b6', defaultRadiusMetres: 3, floorBased: false, guidance: 'Beams, columns, roof structure, high load zones, older structural areas.' },
  { label: 'Water Leak Sensor', riskCategory: 'Water leakage', color: '#22d3ee', defaultRadiusMetres: 2, floorBased: true, guidance: 'Pipe runs, risers, tanks, wet rooms, plant rooms.' },
  { label: 'Air Quality Sensor', riskCategory: 'Indoor air quality', color: '#4ade80', defaultRadiusMetres: 5, floorBased: false, guidance: 'Occupied spaces, ventilation zones, enclosed work areas.' },
  { label: 'Access Route Sensor', riskCategory: 'Access and evacuation', color: '#facc15', defaultRadiusMetres: 4, floorBased: true, guidance: 'Evacuation paths, exits, stairwells, corridors.' },
  { label: 'Power Failure Sensor', riskCategory: 'Power failure', color: '#fb7185', defaultRadiusMetres: 3, floorBased: false, guidance: 'Switch rooms, distribution boards, UPS rooms, generators.' },
  { label: 'CCTV Coverage Sensor', riskCategory: 'Security', color: '#818cf8', defaultRadiusMetres: 8, floorBased: false, guidance: 'Entrances, perimeters, loading bays, blind spots.' },
  { label: 'Gas Sensor', riskCategory: 'Environmental', color: '#34d399', defaultRadiusMetres: 3, floorBased: false, guidance: 'Boiler rooms, gas risers, kitchens, plant rooms.' },
  { label: 'Humidity Sensor', riskCategory: 'Environmental', color: '#2dd4bf', defaultRadiusMetres: 4, floorBased: false, guidance: 'Basements, archives, server rooms, enclosed voids.' },
];

export const SENSITIVITY_LEVELS = ['Low', 'Medium', 'High'];
export const SENSOR_STATUSES = ['Planned', 'Virtual', 'Installed', 'Inactive'];
export const INSTALLATION_PRIORITIES = ['Low', 'Medium', 'High'];

export function getSensorTypeMeta(label) {
  return SENSOR_TYPES.find((t) => t.label === label) || SENSOR_TYPES[0];
}
