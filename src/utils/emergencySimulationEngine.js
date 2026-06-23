// Emergency simulation orchestrator.
// Delegates frame computation to type-specific modules and assembles the result object.
// All outputs are indicative and for preliminary planning only.

import { computeFireFrames, generateFireRecommendations }           from './fireSimulation.js';
import { computeExplosionFrames, generateExplosionRecommendations } from './explosionSimulation.js';
import { computeRiotFrames, generateRiotRecommendations }           from './riotSimulation.js';
import { computeHostageFrames, generateHostageRecommendations }     from './hostageSimulation.js';
import { computeFloodFrames, generateFloodRecommendations }         from './floodSimulation.js';
import { computeGasLeakFrames, generateGasLeakRecommendations }     from './gasLeakSimulation.js';
import { getActivatedSensors, getFirstDetectionTime }               from './sensorActivationEngine.js';
import { generateOccupancyRecommendations }                         from './occupancyEngine.js';

let scenarioCounter = 1;
function generateScenarioId() {
  return `SCN${String(scenarioCounter++).padStart(3, '0')}`;
}

const TYPE_LABELS = {
  fire:      'Fire',
  explosion: 'Explosion',
  riot:      'Riot / Unauthorised Entry',
  hostage:   'Hostage Situation',
  flood:     'Flood',
  gasLeak:   'Gas Leak',
};

/**
 * Run a full simulation and return a result object.
 *
 * @param {object} config        - { type, location, locationLabel, params }
 * @param {object[]} sensors     - sensor array from App state
 * @param {object} occupancy     - occupancy configuration
 * @param {object|null} modelInfo - model dimensions info
 * @param {number} scaleFactor   - metres per model unit
 */
export function runEmergencySimulation(config, sensors, occupancy, modelInfo, scaleFactor) {
  if (!config?.type || !config?.location) {
    throw new Error('Simulation config must include type and location.');
  }

  let frames, recommendations;

  switch (config.type) {
    case 'fire': {
      frames = computeFireFrames(config, sensors, occupancy, modelInfo, scaleFactor);
      recommendations = generateFireRecommendations(frames, config, sensors);
      break;
    }
    case 'explosion': {
      frames = computeExplosionFrames(config, sensors, occupancy, modelInfo, scaleFactor);
      recommendations = generateExplosionRecommendations(frames, config, sensors);
      break;
    }
    case 'riot': {
      frames = computeRiotFrames(config, sensors, occupancy, modelInfo, scaleFactor);
      recommendations = generateRiotRecommendations(frames, config, sensors);
      break;
    }
    case 'hostage': {
      frames = computeHostageFrames(config, sensors, occupancy, modelInfo, scaleFactor);
      recommendations = generateHostageRecommendations(frames, config, sensors);
      break;
    }
    case 'flood': {
      frames = computeFloodFrames(config, sensors, occupancy, modelInfo, scaleFactor);
      recommendations = generateFloodRecommendations(frames, config, sensors);
      break;
    }
    case 'gasLeak': {
      frames = computeGasLeakFrames(config, sensors, occupancy, modelInfo, scaleFactor);
      recommendations = generateGasLeakRecommendations(frames, config, sensors);
      break;
    }
    default:
      throw new Error(`Unknown emergency type: ${config.type}`);
  }

  if (!frames?.length) throw new Error('Simulation produced no frames.');

  const finalFrame  = frames[frames.length - 1];
  const allActivations  = finalFrame.sensorActivations ?? [];
  const activated       = getActivatedSensors(allActivations);
  const firstDetection  = getFirstDetectionTime(allActivations);
  const finalOccupancy  = finalFrame.occupancyImpact ?? {};

  const dataLimitations = buildDataLimitations(config, sensors, modelInfo);

  // Merge occupancy-level recommendations
  const occRecs = generateOccupancyRecommendations(finalOccupancy, occupancy)
    .map((text) => ({ priority: 'High', text }));
  const allRecs = [...occRecs, ...recommendations];

  const finalSummary = {
    riskLevel:       classifyOverallRisk(finalFrame),
    affectedPeople:  finalOccupancy.totalAffected   ?? 0,
    inCriticalZone:  finalOccupancy.inCritical       ?? 0,
    evacuatingPeople: finalOccupancy.evacuating      ?? 0,
    trappedPeople:   finalOccupancy.trapped          ?? 0,
    activatedSensors: activated.length,
    firstDetectionTime: firstDetection,
    blockedRoutes:   estimateBlockedRoutes(finalFrame),
    availableExits:  estimateAvailableExits(finalFrame, sensors),
    recommendations: allRecs,
    dataLimitations,
    simulationConfidence: dataLimitations.length > 3 ? 'Low' : dataLimitations.length > 1 ? 'Medium' : 'High',
  };

  return {
    scenarioId:           generateScenarioId(),
    scenarioType:         config.type,
    scenarioLabel:        TYPE_LABELS[config.type] ?? config.type,
    incidentLocation:     config.location,
    incidentLocationLabel: config.locationLabel ?? 'Unknown location',
    params:               config.params,
    occupancy,
    durationSeconds:      config.params?.durationSeconds ?? 600,
    frames,
    finalSummary,
    createdAt:            new Date().toISOString(),
    disclaimer: 'This simulation is indicative only and does not replace professional engineering, fire safety, structural, or evacuation analysis.',
  };
}

function classifyOverallRisk(frame) {
  const zones = frame.impactZones ?? [];
  if (zones.some((z) => ['extreme', 'critical'].includes(z.level))) return 'High';
  if (zones.some((z) => z.level === 'serious')) return 'Medium';
  return 'Low';
}

function estimateBlockedRoutes(frame) {
  const maxCritR = (frame.impactZones ?? [])
    .filter((z) => ['extreme', 'critical'].includes(z.level))
    .reduce((max, z) => Math.max(max, z.radius), 0);

  if (maxCritR > 15) return 3;
  if (maxCritR > 7)  return 2;
  if (maxCritR > 2)  return 1;
  return 0;
}

function estimateAvailableExits(frame, sensors) {
  const accessSensors = sensors.filter((s) => s.type === 'Access Route Sensor');
  const activatedIds  = (frame.sensorActivations ?? [])
    .filter((a) => a.status === 'Activated').map((a) => a.sensorId);

  const blocked = accessSensors.filter((s) => activatedIds.includes(s.id)).length;
  const total   = Math.max(accessSensors.length, 2); // assume minimum 2 exits if none marked
  return Math.max(0, total - blocked);
}

function buildDataLimitations(config, sensors, modelInfo) {
  const lims = [];
  if (!modelInfo) lims.push('Model dimensions not confirmed — spatial calculations are approximate.');
  if (sensors.length === 0) lims.push('No sensors placed — sensor activation analysis unavailable.');
  if (config.type === 'fire' && !sensors.some((s) => /heat|thermal/i.test(s.type))) {
    lims.push('No heat or thermal detection sensors — first detection time cannot be calculated.');
  }
  if (config.type === 'hostage' && !sensors.some((s) => /camera/i.test(s.type) && !/thermal/i.test(s.type))) {
    lims.push('No visual cameras placed — hostage detection and alarm triggering cannot be calculated.');
  }
  lims.push('Room boundaries and door positions are not modelled — spread may differ in practice.');
  lims.push('Occupancy distribution is estimated — actual impact depends on real occupancy data.');
  return lims;
}
