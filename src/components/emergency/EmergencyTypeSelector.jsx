// Step 1 of the wizard — visual grid for choosing the emergency type.

const EMERGENCY_TYPES = [
  {
    id: 'fire',
    label: 'Fire',
    icon: 'F',
    iconBg: '#7f1d1d',
    iconColor: '#fca5a5',
    description: 'Structural or contents fire with heat and smoke spread.',
    riskCategory: 'Fire & Life Safety',
  },
  {
    id: 'explosion',
    label: 'Explosion',
    icon: 'X',
    iconBg: '#7c2d12',
    iconColor: '#fdba74',
    description: 'Blast impact with concentric pressure, debris and fire zones.',
    riskCategory: 'Structural & Blast',
  },
  {
    id: 'riot',
    label: 'Riot / Entry',
    icon: 'R',
    iconBg: '#4c1d95',
    iconColor: '#c4b5fd',
    description: 'Unauthorised entry or crowd disturbance affecting access areas.',
    riskCategory: 'Security',
  },
  {
    id: 'hostage',
    label: 'Hostage',
    icon: 'H',
    iconBg: '#7f1d1d',
    iconColor: '#fecaca',
    description: 'Camera-confirmed hostage incident that triggers placed alarms.',
    riskCategory: 'Security',
  },
  {
    id: 'flood',
    label: 'Flood',
    icon: 'W',
    iconBg: '#1e3a5f',
    iconColor: '#93c5fd',
    description: 'Rising water affecting low-level areas, basements and exits.',
    riskCategory: 'Flood & Water',
  },
  {
    id: 'gasLeak',
    label: 'Gas Leak',
    icon: 'G',
    iconBg: '#14532d',
    iconColor: '#86efac',
    description: 'Gas dispersal from a source with ignition and toxicity hazard zones.',
    riskCategory: 'Environmental',
  },
  {
    id: 'smoke',
    label: 'Smoke',
    icon: 'S',
    iconBg: '#1f2937',
    iconColor: '#9ca3af',
    description: 'Smoke spread without active fire — use Fire scenario for combined events.',
    riskCategory: 'Fire & Life Safety',
    disabled: true,
    disabledReason: 'Use the Fire scenario — smoke is included automatically.',
  },
  {
    id: 'structural',
    label: 'Structural',
    icon: 'ST',
    iconBg: '#292524',
    iconColor: '#d6d3d1',
    description: 'Partial or full structural failure affecting building integrity.',
    riskCategory: 'Structural',
    disabled: true,
    disabledReason: 'Coming in a future release.',
  },
  {
    id: 'power',
    label: 'Power Failure',
    icon: 'P',
    iconBg: '#1c1917',
    iconColor: '#fde68a',
    description: 'Loss of electrical power affecting systems and evacuation lighting.',
    riskCategory: 'Utilities',
    disabled: true,
    disabledReason: 'Coming in a future release.',
  },
  {
    id: 'chemical',
    label: 'Chemical Spill',
    icon: 'C',
    iconBg: '#1a2e05',
    iconColor: '#a3e635',
    description: 'Chemical release with contamination and exclusion zones.',
    riskCategory: 'Environmental',
    disabled: true,
    disabledReason: 'Coming in a future release.',
  },
  {
    id: 'blockedRoute',
    label: 'Blocked Route',
    icon: 'B',
    iconBg: '#1c1917',
    iconColor: '#fbbf24',
    description: 'An evacuation route is blocked, affecting escape options.',
    riskCategory: 'Access & Evacuation',
    disabled: true,
    disabledReason: 'Coming in a future release.',
  },
];

export default function EmergencyTypeSelector({ selected, onSelect }) {
  return (
    <div className="emergency-type-grid">
      {EMERGENCY_TYPES.map((et) => {
        const isSelected = selected === et.id;
        const cls = [
          'em-type-card',
          isSelected ? 'selected' : '',
          et.disabled ? 'disabled' : '',
        ].filter(Boolean).join(' ');

        return (
          <button
            key={et.id}
            className={cls}
            onClick={() => !et.disabled && onSelect(et.id)}
            title={et.disabled ? et.disabledReason : et.description}
            disabled={et.disabled}
          >
            <span
              className="em-type-icon"
              style={{ background: et.iconBg, color: et.iconColor }}
            >
              {et.icon}
            </span>
            <span className="em-type-label">{et.label}</span>
            {!et.disabled && (
              <span className="em-type-desc">{et.description}</span>
            )}
            {et.disabled && (
              <span className="em-type-desc em-type-soon">Coming soon</span>
            )}
            <span className="em-type-cat">{et.riskCategory}</span>
          </button>
        );
      })}
    </div>
  );
}

export { EMERGENCY_TYPES };
