// Rule based scenarios evaluated by utils/riskEngine.js.
export const DEFAULT_SCENARIOS = [
  {
    id: 'flood',
    name: 'Flood risk',
    description: 'Checks flood and water leak sensors against the assumed flood level.',
  },
  {
    id: 'fire',
    name: 'Fire risk',
    description: 'Evaluates coverage of fire, smoke, heat and temperature sensors.',
  },
  {
    id: 'security',
    name: 'Security risk',
    description: 'Checks the number of security and CCTV coverage sensors.',
  },
  {
    id: 'structural',
    name: 'Structural risk',
    description: 'Checks whether structural monitoring points exist.',
  },
  {
    id: 'access',
    name: 'Access and evacuation',
    description: 'Checks monitoring of exit routes, corridors and stairwells.',
  },
];
