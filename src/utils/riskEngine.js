// Rule based scenario engine. Each scenario returns:
// { scenarioId, scenarioName, riskLevel, reason, affectedSensors, coverageStatus, recommendation, quotationImpact }
import {
  calculateTotalCoverageArea,
  calculateCoveragePercentage,
  calculateCoverageStatus,
} from './coverageEngine.js';

export const RISK_LEVELS = ['Low', 'Medium', 'High', 'Data Gap'];

const FIRE_TYPES = ['Fire Sensor', 'Smoke Sensor', 'Heat Sensor', 'Temperature Sensor'];
const FLOOD_TYPES = ['Flood Sensor', 'Water Leak Sensor'];
const SECURITY_TYPES = ['Security Sensor', 'CCTV Coverage Sensor'];
const STRUCTURAL_TYPES = ['Structural Sensor'];
const ACCESS_TYPES = ['Access Route Sensor'];

const RECOMMENDATIONS = {
  flood:
    'Install real water level sensors, inspect drainage, provide flood mitigation evidence, and add basement water monitoring.',
  fire:
    'Install real smoke and temperature sensors, confirm fire escape routes, upload a fire assessment report, and improve plant room monitoring.',
  security:
    'Add security sensors near entry points, loading bays, and blind spots.',
  structural:
    'Add structural monitoring points for beams, roof zones, columns, high load areas, and older structural areas.',
  access:
    'Add virtual sensors to key exit routes, corridors, and stairwells, and simulate blocked exit scenarios.',
};

export function calculateQuotationImpact(riskLevel) {
  switch (riskLevel) {
    case 'High':
      return 'Quotation value may increase.';
    case 'Medium':
      return 'Quotation value may need review.';
    case 'Low':
      return 'Quotation value may decrease or remain stable.';
    default:
      return 'Additional assessment required before quotation confidence can improve.';
  }
}

export function calculateRiskLevel(coveragePercentage) {
  if (coveragePercentage <= 40) return 'High';
  if (coveragePercentage <= 70) return 'Medium';
  return 'Low';
}

export function generateRecommendation(scenarioId, riskLevel) {
  if (riskLevel === 'Low') {
    return 'Current virtual sensor layout looks reasonable. Validate against real installed sensors and keep evidence up to date.';
  }
  return RECOMMENDATIONS[scenarioId] || 'Review sensor layout and provide supporting evidence.';
}

export function identifyDataGaps(sensors) {
  const gaps = [];
  const has = (types) => sensors.some((s) => types.includes(s.type));
  if (!has(FLOOD_TYPES)) gaps.push('No flood or water leak sensors placed.');
  if (!has(FIRE_TYPES)) gaps.push('No fire, smoke, heat or temperature sensors placed.');
  if (!has(SECURITY_TYPES)) gaps.push('No security or CCTV coverage sensors placed.');
  if (!has(STRUCTURAL_TYPES)) gaps.push('No structural monitoring sensors placed.');
  if (!has(ACCESS_TYPES)) gaps.push('No access route sensors placed.');
  return gaps;
}

function result(scenarioId, scenarioName, riskLevel, reason, affectedSensors, coverageStatus) {
  return {
    scenarioId,
    scenarioName,
    riskLevel,
    reason,
    affectedSensors: affectedSensors.map((s) => s.name),
    coverageStatus,
    recommendation: generateRecommendation(scenarioId, riskLevel),
    quotationImpact: calculateQuotationImpact(riskLevel),
  };
}

// coverageData: { requiredAreaM2, scaleFactor, floodLevelMetres }
export function runScenario(scenarioId, sensors, coverageData = {}) {
  const { requiredAreaM2 = 0, scaleFactor = 1, floodLevelMetres = 1 } = coverageData;

  switch (scenarioId) {
    case 'flood': {
      const flood = sensors.filter((s) => FLOOD_TYPES.includes(s.type));
      if (flood.length === 0) {
        return result('flood', 'Flood risk', 'Data Gap', 'No flood or water leak sensors exist in the model.', [], 'No coverage data');
      }
      const lowLevel = flood.filter((s) => s.position.y * scaleFactor <= floodLevelMetres);
      if (lowLevel.length > 0) {
        return result(
          'flood', 'Flood risk', 'High',
          `${lowLevel.length} water sensor(s) sit below the assumed flood level of ${floodLevelMetres} m, indicating monitored low-level water exposure zones.`,
          lowLevel, 'Low level zones monitored'
        );
      }
      return result(
        'flood', 'Flood risk', 'Low',
        `Flood monitoring exists and all water sensors sit above the assumed flood level of ${floodLevelMetres} m.`,
        flood, 'Monitored'
      );
    }

    case 'fire': {
      const fire = sensors.filter((s) => FIRE_TYPES.includes(s.type));
      if (fire.length === 0) {
        return result('fire', 'Fire risk', 'Data Gap', 'No fire, smoke, heat or temperature sensors exist in the model.', [], 'No coverage data');
      }
      const covered = calculateTotalCoverageArea(fire, 'All');
      const pct = calculateCoveragePercentage(covered, requiredAreaM2);
      const status = requiredAreaM2 > 0 ? calculateCoverageStatus(pct) : 'Required area not set';
      const level = requiredAreaM2 > 0 ? calculateRiskLevel(pct) : 'Medium';
      const reason =
        requiredAreaM2 > 0
          ? `${fire.length} fire-related sensor(s) cover an estimated ${covered.toFixed(1)} m² of a required ${requiredAreaM2} m² (${Math.min(pct, 999).toFixed(1)}%).`
          : `${fire.length} fire-related sensor(s) exist, but no required zone area is set in the coverage summary.`;
      return result('fire', 'Fire risk', level, reason, fire, status);
    }

    case 'security': {
      const security = sensors.filter((s) => SECURITY_TYPES.includes(s.type));
      if (security.length === 0) {
        return result('security', 'Security risk', 'Data Gap', 'No security or CCTV coverage sensors exist in the model.', [], 'No coverage data');
      }
      if (security.length < 2) {
        return result(
          'security', 'Security risk', 'Medium',
          'Fewer than two security or CCTV coverage sensors are placed — entry points and blind spots are likely unmonitored.',
          security, 'Partial coverage'
        );
      }
      return result('security', 'Security risk', 'Low', `${security.length} security/CCTV sensors are placed.`, security, 'Monitored');
    }

    case 'structural': {
      const structural = sensors.filter((s) => STRUCTURAL_TYPES.includes(s.type));
      if (structural.length === 0) {
        return result('structural', 'Structural risk', 'Data Gap', 'No structural monitoring sensors exist in the model.', [], 'No coverage data');
      }
      return result(
        'structural', 'Structural risk', 'Low',
        `Structural monitoring is available via ${structural.length} sensor(s).`,
        structural, 'Monitoring available'
      );
    }

    case 'access': {
      const access = sensors.filter((s) => ACCESS_TYPES.includes(s.type));
      if (access.length === 0) {
        return result('access', 'Access and evacuation', 'Data Gap', 'No access route sensors exist in the model.', [], 'No coverage data');
      }
      if (access.length < 2) {
        return result(
          'access', 'Access and evacuation', 'Medium',
          'Only one access route sensor is placed — multiple escape routes are not yet monitored.',
          access, 'Partial coverage'
        );
      }
      return result('access', 'Access and evacuation', 'Low', `${access.length} access route sensors monitor exit routes.`, access, 'Monitored');
    }

    default:
      return result(scenarioId, scenarioId, 'Data Gap', 'Unknown scenario.', [], 'No coverage data');
  }
}
