// Colour and metadata for each impact severity level.
// Used by both the 3D overlay and the UI legend/badges.

export const IMPACT_LEVELS = {
  extreme:  { color: '#dc2626', opacity: 0.30, label: 'Extreme danger',     cssColor: '#dc2626' },
  critical: { color: '#ef4444', opacity: 0.22, label: 'Critical impact',    cssColor: '#ef4444' },
  serious:  { color: '#f97316', opacity: 0.17, label: 'Serious impact',     cssColor: '#f97316' },
  caution:  { color: '#fbbf24', opacity: 0.12, label: 'Caution',            cssColor: '#fbbf24' },
  safe:     { color: '#4ade80', opacity: 0.08, label: 'Safe / low impact',  cssColor: '#4ade80' },
  unknown:  { color: '#6b7280', opacity: 0.08, label: 'Unknown (data gap)', cssColor: '#6b7280' },
};

export function getImpactMeta(level) {
  return IMPACT_LEVELS[level] ?? IMPACT_LEVELS.unknown;
}

export function getImpactColor(level) {
  return getImpactMeta(level).color;
}

export function getImpactOpacity(level) {
  return getImpactMeta(level).opacity;
}

// Map overall risk level string to an impact level key
export function riskLevelToImpact(riskLevel) {
  switch (riskLevel) {
    case 'High':   return 'critical';
    case 'Medium': return 'serious';
    case 'Low':    return 'caution';
    default:       return 'unknown';
  }
}

// Badge CSS class used in the results dashboard
export function impactBadgeClass(level) {
  switch (level) {
    case 'extreme':
    case 'critical': return 'badge badge-high';
    case 'serious':  return 'badge badge-medium';
    case 'caution':  return 'badge badge-medium';
    case 'safe':     return 'badge badge-low';
    default:         return 'badge badge-gap';
  }
}

export function riskBadgeClass(level) {
  switch (level) {
    case 'High':   return 'badge badge-high';
    case 'Medium': return 'badge badge-medium';
    case 'Low':    return 'badge badge-low';
    default:       return 'badge badge-gap';
  }
}
