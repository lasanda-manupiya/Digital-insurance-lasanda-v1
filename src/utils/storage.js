// localStorage persistence. No backend needed for the MVP.
const SENSORS_KEY = 'twinrisk.sensors';
const SCALE_KEY = 'twinrisk.scaleSettings';
const PROJECT_KEY = 'twinrisk.projectSettings';
const MANUAL_TAGS_KEY = 'twinrisk.manualTags';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — non fatal for the demo
  }
}

export function saveSensors(sensors) {
  save(SENSORS_KEY, sensors);
}

export function loadSensors() {
  return load(SENSORS_KEY, []);
}

export function clearSensors() {
  localStorage.removeItem(SENSORS_KEY);
}

export function saveManualTags(tags) {
  save(MANUAL_TAGS_KEY, tags);
}

export function loadManualTags() {
  return load(MANUAL_TAGS_KEY, []);
}

export function saveScaleSettings(scaleSettings) {
  save(SCALE_KEY, scaleSettings);
}

export function loadScaleSettings() {
  return load(SCALE_KEY, null);
}

export function saveProjectSettings(projectSettings) {
  save(PROJECT_KEY, projectSettings);
}

export function loadProjectSettings() {
  return load(PROJECT_KEY, null);
}

// ---- project file export / import (portable .json, shareable between machines) ----

const PROJECT_FILE_VERSION = 1;

export function buildProjectFile({ sensors, scaleSettings, projectSettings, manualTags = [], modelFileName }) {
  return {
    app: 'twinrisk-ai-demo',
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    modelFileName,
    scaleSettings,
    projectSettings,
    manualTags,
    sensors,
  };
}

export function downloadProjectFile(data, fileName = 'twinrisk-project.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseProjectFile(file) {
  const data = JSON.parse(await file.text());
  if (data.app !== 'twinrisk-ai-demo' || !Array.isArray(data.sensors)) {
    throw new Error('Not a valid TwinRisk project file.');
  }
  return data;
}
