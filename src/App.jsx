import { useCallback, useEffect, useRef, useState } from 'react';

// Core viewer
import ModelViewer          from './components/ModelViewer.jsx';
import ModelInfoPanel       from './components/ModelInfoPanel.jsx';
import ScaleCalibrationPanel from './components/ScaleCalibrationPanel.jsx';
import RecommendationPanel  from './components/RecommendationPanel.jsx';

// Refactored panels
import TopBar               from './components/TopBar.jsx';
import SensorPanel          from './components/SensorPanel.jsx';

// Emergency simulation
import EmergencyWizard      from './components/emergency/EmergencyWizard.jsx';
import SimulationTimeline   from './components/emergency/SimulationTimeline.jsx';
import ResultsPanel         from './components/emergency/ResultsPanel.jsx';
import InsuranceRiskChecklistPanel from './components/InsuranceRiskChecklistPanel.jsx';

// Data + utilities
import { DEFAULT_SCENARIOS } from './data/defaultScenarios.js';
import { getSensorTypeMeta }  from './data/sensorTypes.js';
import { runScenario }        from './utils/riskEngine.js';
import { DEFAULT_OCCUPANCY }  from './utils/occupancyEngine.js';
import { DEFAULT_PARAMS }     from './components/emergency/ScenarioConfiguration.jsx';
import { runEmergencySimulation } from './utils/emergencySimulationEngine.js';
import { assessRiskCategory, buildRiskOverlays } from './utils/insuranceRiskEngine.js';
import {
  loadSensors, saveSensors, clearSensors,
  loadManualTags, saveManualTags,
  loadScaleSettings, saveScaleSettings,
  loadProjectSettings, saveProjectSettings,
  buildProjectFile, downloadProjectFile, parseProjectFile,
} from './utils/storage.js';

const DEFAULT_SCALE = {
  scaleFactor:    1,
  unitAssumption: '1 model unit = 1 metre',
  confirmed:      false,
  method:         null,
};

const DEFAULT_PROJECT = {
  zoneName:            'Plant Room',
  requiredAreaM2:      36,
  coverageSensorType:  'All',
};

function nextSensorId(sensors) {
  const max = sensors.reduce((m, s) => {
    const n = parseInt(String(s.id).replace(/^S/, ''), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `S${String(max + 1).padStart(3, '0')}`;
}

export default function App() {
  // ---- model state ----
  const [modelSource, setModelSource] = useState({
    kind: 'url',
    url: '/models/sample-building.glb',
    fileName: 'sample-building.glb',
  });
  const [modelInfo,    setModelInfo]    = useState(null);
  const [modelLoading, setModelLoading] = useState(false);

  // ---- sensor state ----
  const [sensors,           setSensors]           = useState(() => loadSensors());
  const [manualTags,        setManualTags]        = useState(() => loadManualTags());
  const [selectedSensorId,  setSelectedSensorId]  = useState(null);
  const [selectedTypeForPlace, setSelectedTypeForPlace] = useState('Heat Sensor - Short Range');

  // ---- interaction mode ----
  // 'orbit' | 'place' | 'calibrate' | 'incident'
  const [interactionMode, setInteractionMode] = useState('orbit');
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [pendingTagPoint, setPendingTagPoint] = useState(null);

  // ---- scale / project settings ----
  const [scaleSettings,   setScaleSettings]   = useState(() => loadScaleSettings()   || DEFAULT_SCALE);
  const [projectSettings, setProjectSettings] = useState(() => loadProjectSettings() || DEFAULT_PROJECT);
  const [floodLevelMetres, setFloodLevelMetres] = useState(1);

  // ---- old risk-engine scenarios (kept for Recommendations panel) ----
  const [scenarioResults, setScenarioResults] = useState([]);

  // ---- app mode navigation ----
  // 'model' | 'sensors' | 'emergency' | 'results'
  const [appMode, setAppMode] = useState('model');

  // ---- emergency wizard state ----
  const [wizardStep,      setWizardStep]      = useState(1);
  const [emergencyType,   setEmergencyType]   = useState(null);
  const [incidentPoint,   setIncidentPoint]   = useState(null);
  const [scenarioParams,  setScenarioParams]  = useState({});
  const [occupancyConfig, setOccupancyConfig] = useState(DEFAULT_OCCUPANCY);

  // ---- simulation state ----
  const [simulationStatus,  setSimulationStatus]  = useState('idle'); // idle | running | complete
  const [simulationResult,  setSimulationResult]  = useState(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  const fileInputRef        = useRef(null);
  const projectFileInputRef = useRef(null);

  // ---- persistence side-effects ----
  useEffect(() => saveSensors(sensors),           [sensors]);
  useEffect(() => saveManualTags(manualTags),     [manualTags]);
  useEffect(() => saveScaleSettings(scaleSettings), [scaleSettings]);
  useEffect(() => saveProjectSettings(projectSettings), [projectSettings]);

  // ---- model callbacks ----
  const handleModelLoaded = useCallback((info) => setModelInfo(info), []);

  const handleModelClick = useCallback(
    (point) => {
      if (interactionMode === 'place') {
        setSensors((prev) => {
          const id   = nextSensorId(prev);
          const meta = getSensorTypeMeta(selectedTypeForPlace);
          const sensor = {
            id,
            name:                 `${selectedTypeForPlace} ${prev.filter((s) => s.type === selectedTypeForPlace).length + 1}`,
            type:                 selectedTypeForPlace,
            riskCategory:         meta.riskCategory,
            position:             point,
            coverageRadiusMetres: meta.defaultRadiusMetres,
            sensitivity:          'Medium',
            status:               'Virtual',
            linkedZone:           '',
            linkedAsset:          '',
            installationPriority: 'Medium',
            evidenceReference:    '',
            notes:                '',
            coverageVisible:      true,
          };
          setSelectedSensorId(id);
          return [...prev, sensor];
        });
      } else if (interactionMode === 'calibrate') {
        setCalibrationPoints((prev) => (prev.length >= 2 ? [point] : [...prev, point]));
      } else if (interactionMode === 'incident') {
        setIncidentPoint(point);
        setInteractionMode('orbit');
      } else if (interactionMode === 'tag') {
        setPendingTagPoint(point);
        setInteractionMode('orbit');
      }
    },
    [interactionMode, selectedTypeForPlace]
  );

  // ---- sensor operations ----
  const updateSensor = (id, patch) =>
    setSensors((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const deleteSensor = (id) => {
    setSensors((prev) => prev.filter((s) => s.id !== id));
    if (selectedSensorId === id) setSelectedSensorId(null);
  };

  const addManualTag = (tag) => {
    setManualTags((prev) => [...prev, { ...tag, id: `T${String(prev.length + 1).padStart(3, '0')}` }]);
    setPendingTagPoint(null);
  };

  const deleteManualTag = (id) => setManualTags((prev) => prev.filter((t) => t.id !== id));

  const handleClearAll = () => {
    if (!window.confirm('Delete all sensors?')) return;
    setSensors([]);
    setSelectedSensorId(null);
    clearSensors();
  };

  // ---- scale operations ----
  const confirmScale = (factor, method) =>
    setScaleSettings({
      scaleFactor:    factor,
      unitAssumption: `1 model unit = ${factor} metre(s)`,
      confirmed:      true,
      method,
    });

  const handleApplyCalibration = (factor) => {
    confirmScale(Number(factor.toFixed(6)), 'two-point calibration');
    setCalibrationPoints([]);
    setInteractionMode('orbit');
  };

  // ---- old risk-engine scenarios ----
  const coverageData = {
    requiredAreaM2:    Number(projectSettings.requiredAreaM2) || 0,
    scaleFactor:       scaleSettings.scaleFactor,
    floodLevelMetres,
  };

  const handleRunScenario = (id) => {
    const r = runScenario(id, sensors, coverageData);
    setScenarioResults((prev) => [...prev.filter((x) => x.scenarioId !== id), r]);
  };

  const handleRunAll = () =>
    setScenarioResults(DEFAULT_SCENARIOS.map((sc) => runScenario(sc.id, sensors, coverageData)));

  // ---- model file upload ----
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'ifc') {
      setModelLoading(true);
      try {
        const { loadIfcModel } = await import('./utils/ifcUtils.js');
        const object = await loadIfcModel(await file.arrayBuffer());
        setModelSource({ kind: 'object', object, fileName: file.name });
        setModelInfo(null);
        setScaleSettings({ ...DEFAULT_SCALE });
      } catch (err) {
        window.alert(`Could not load IFC file: ${err.message}`);
      } finally {
        setModelLoading(false);
      }
      return;
    }

    setModelSource({ kind: 'url', url: URL.createObjectURL(file), fileName: file.name });
    setModelInfo(null);
    setScaleSettings({ ...DEFAULT_SCALE });
  };

  // ---- project save / open ----
  const handleSaveProject = () => {
    const data = buildProjectFile({
      sensors, scaleSettings, projectSettings, manualTags,
      modelFileName: modelSource.fileName,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadProjectFile(data, `twinrisk-project-${stamp}.json`);
  };

  const handleOpenProject = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await parseProjectFile(file);
      setSensors(data.sensors);
      if (data.scaleSettings)   setScaleSettings(data.scaleSettings);
      if (data.projectSettings) setProjectSettings(data.projectSettings);
      if (Array.isArray(data.manualTags)) setManualTags(data.manualTags);
      setSelectedSensorId(null);
      setScenarioResults([]);
      if (data.modelFileName && data.modelFileName !== modelSource.fileName) {
        window.alert(
          `Project loaded. It was saved against model "${data.modelFileName}" — ` +
          'load that model file so sensor positions line up.'
        );
      }
    } catch (err) {
      window.alert(`Could not open project file: ${err.message}`);
    }
  };

  // ---- emergency wizard handlers ----
  const handleEmergencyTypeChange = (type) => {
    setEmergencyType(type);
    setScenarioParams(DEFAULT_PARAMS[type] ?? {});
  };

  const handleStartIncidentPlacement = () => {
    setInteractionMode('incident');
  };

  const handleClearIncidentLocation = () => {
    setIncidentPoint(null);
  };

  const handleManualIncidentCoords = (point) => {
    setIncidentPoint(point);
    setInteractionMode('orbit');
  };

  const handleRunSimulation = () => {
    if (!emergencyType || !incidentPoint) return;
    setSimulationStatus('running');
    try {
      const config = {
        type:          emergencyType,
        location:      incidentPoint,
        locationLabel: `x ${incidentPoint.x.toFixed(1)}, y ${incidentPoint.y.toFixed(1)}, z ${incidentPoint.z.toFixed(1)}`,
        params:        scenarioParams,
      };
      const result = runEmergencySimulation(
        config, sensors, occupancyConfig, modelInfo, scaleSettings.scaleFactor
      );
      setSimulationResult(result);
      setCurrentFrameIndex(0);
      setSimulationStatus('complete');
      setAppMode('results'); // jump to results tab
    } catch (err) {
      window.alert(`Simulation error: ${err.message}`);
      setSimulationStatus('idle');
    }
  };

  const handleResetSimulation = () => {
    setSimulationResult(null);
    setSimulationStatus('idle');
    setCurrentFrameIndex(0);
    setWizardStep(1);
    setEmergencyType(null);
    setIncidentPoint(null);
    setScenarioParams({});
    setAppMode('emergency');
  };

  // Derive activated sensor IDs for the current frame (so ModelViewer can highlight them)
  const currentSimFrame = simulationResult?.frames?.[currentFrameIndex] ?? null;
  const activatedSensorIds = (currentSimFrame?.sensorActivations ?? [])
    .filter((a) => a.status === 'Activated')
    .map((a) => a.sensorId);

  const selectedSensor = sensors.find((s) => s.id === selectedSensorId) || null;
  const insuranceAssessment = assessRiskCategory('fire', { sensors, manualTags, modelInfo, projectSettings, occupancyConfig });
  const insuranceOverlays = buildRiskOverlays(insuranceAssessment);

  // Viewer toolbar text
  const modeChip = {
    orbit:    'Orbit — drag to rotate, scroll to zoom',
    place:    'Place mode — click model to drop a sensor',
    calibrate:'Calibration mode — click two reference points',
    incident: 'Incident placement — click model to set emergency location',
    tag:      'Manual tagging — click model to tag infrastructure or evidence',
  }[interactionMode] ?? '';

  return (
    <div className="app-shell">
      {/* ---- Top bar ---- */}
      <TopBar
        appMode={appMode}
        onModeChange={setAppMode}
        onLoadModel={() => fileInputRef.current?.click()}
        onSaveProject={handleSaveProject}
        onOpenProject={() => projectFileInputRef.current?.click()}
        modelFileName={modelSource.fileName}
        simulationStatus={simulationStatus}
        modelLoading={modelLoading}
      />

      {/* Hidden file inputs */}
      <input ref={fileInputRef}        type="file" accept=".glb,.gltf,.ifc" hidden onChange={handleUpload} />
      <input ref={projectFileInputRef} type="file" accept=".json"           hidden onChange={handleOpenProject} />

      {/* ---- Main body ---- */}
      <div className="app-body">

        {/* ---- 3D viewer area ---- */}
        <main className="viewer-wrap">
          <ModelViewer
            modelSource={modelSource}
            modelInfo={modelInfo}
            interactionMode={interactionMode}
            sensors={sensors}
            selectedSensorId={selectedSensorId}
            calibrationPoints={calibrationPoints}
            scaleFactor={scaleSettings.scaleFactor}
            incidentPoint={incidentPoint}
            currentSimFrame={currentSimFrame}
            activatedSensorIds={activatedSensorIds}
            onModelLoaded={handleModelLoaded}
            onModelClick={handleModelClick}
            onSelectSensor={setSelectedSensorId}
            insuranceOverlays={insuranceOverlays}
          />

          {/* Mode chip overlay */}
          <div className="viewer-toolbar">
            <span className={interactionMode !== 'orbit' ? 'mode-chip active' : 'mode-chip'}>
              {modeChip}
            </span>
          </div>

          {/* Simulation timeline (only during / after simulation) */}
          {simulationResult && (
            <SimulationTimeline
              frames={simulationResult.frames}
              currentFrameIndex={currentFrameIndex}
              onFrameChange={setCurrentFrameIndex}
              scenarioLabel={simulationResult.scenarioLabel}
              scenarioType={simulationResult.scenarioType}
            />
          )}
        </main>

        {/* ---- Side panel ---- */}
        <aside className="side-panel">
          <div className="panel-content">

            {/* MODEL mode */}
            {appMode === 'model' && (
              <>
                <ModelInfoPanel modelInfo={modelInfo} scaleSettings={scaleSettings} />
                <ScaleCalibrationPanel
                  scaleSettings={scaleSettings}
                  interactionMode={interactionMode}
                  calibrationPoints={calibrationPoints}
                  modelLoaded={!!modelInfo}
                  onAcceptDetected={() => confirmScale(1, 'detected scale accepted')}
                  onApplyManualScale={(f) => confirmScale(f, 'manual scale factor')}
                  onStartCalibration={() => { setCalibrationPoints([]); setInteractionMode('calibrate'); }}
                  onCancelCalibration={() => { setCalibrationPoints([]); setInteractionMode('orbit'); }}
                  onApplyCalibration={handleApplyCalibration}
                />
                <RecommendationPanel results={scenarioResults} sensors={sensors} />
              </>
            )}

            {/* SENSORS mode */}
            {appMode === 'sensors' && (
              <SensorPanel
                sensors={sensors}
                selectedSensor={selectedSensor}
                interactionMode={interactionMode}
                projectSettings={projectSettings}
                onSelect={setSelectedSensorId}
                onUpdate={updateSensor}
                onDelete={deleteSensor}
                onTogglePlaceMode={() =>
                  setInteractionMode((m) => (m === 'place' ? 'orbit' : 'place'))
                }
                onClearAll={handleClearAll}
                onChangeProjectSettings={setProjectSettings}
                selectedTypeForPlace={selectedTypeForPlace}
                onSelectedTypeChange={setSelectedTypeForPlace}
              />
            )}

            {/* EMERGENCY mode */}
            {appMode === 'emergency' && (
              <EmergencyWizard
                wizardStep={wizardStep}
                onWizardStepChange={setWizardStep}
                emergencyType={emergencyType}
                incidentPoint={incidentPoint}
                scenarioParams={scenarioParams}
                occupancy={occupancyConfig}
                sensors={sensors}
                scaleSettings={scaleSettings}
                simulationStatus={simulationStatus}
                interactionMode={interactionMode}
                onEmergencyTypeChange={handleEmergencyTypeChange}
                onStartIncidentPlacement={handleStartIncidentPlacement}
                onClearIncidentLocation={handleClearIncidentLocation}
                onManualIncidentCoords={handleManualIncidentCoords}
                onParamsChange={setScenarioParams}
                onOccupancyChange={setOccupancyConfig}
                onRunSimulation={handleRunSimulation}
              />
            )}

            {/* INSURANCE CHECKLIST mode */}
            {appMode === 'insurance' && (
              <InsuranceRiskChecklistPanel
                sensors={sensors}
                manualTags={manualTags}
                pendingTagPoint={pendingTagPoint}
                modelInfo={modelInfo}
                projectSettings={projectSettings}
                occupancyConfig={occupancyConfig}
                onStartTagging={() => setInteractionMode('tag')}
                onAddManualTag={addManualTag}
                onDeleteManualTag={deleteManualTag}
                onUpdateOccupancy={setOccupancyConfig}
              />
            )}

            {/* RESULTS mode */}
            {appMode === 'results' && (
              <ResultsPanel
                simulationResult={simulationResult}
                onViewIn3D={() => {
                  setCurrentFrameIndex(simulationResult?.frames?.length - 1 ?? 0);
                }}
                onReset={handleResetSimulation}
              />
            )}

          </div>
        </aside>
      </div>
    </div>
  );
}
