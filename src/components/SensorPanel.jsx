// Refactored sensor panel — three tabs: Place | Edit | Coverage.
// Replaces the previous single-section layout that combined all three concerns.

import { useState } from 'react';
import {
  SENSOR_TYPES,
  SENSITIVITY_LEVELS,
  SENSOR_STATUSES,
  INSTALLATION_PRIORITIES,
  getSensorTypeMeta,
  estimateDetectedTemperature,
} from '../data/sensorTypes.js';
import { RISK_CATEGORIES } from '../data/riskCategories.js';
import {
  calculateSensorCoverageArea,
  calculateTotalCoverageArea,
  calculateCoveragePercentage,
  calculateCoverageStatus,
  estimateAdditionalSensorsNeeded,
  identifyCoverageGaps,
  recommendAdditionalSensors,
} from '../utils/coverageEngine.js';

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}


function SensorSpecCard({ sensorType, coverageRadiusMetres }) {
  const meta = getSensorTypeMeta(sensorType);
  const radius = Number(coverageRadiusMetres ?? meta.defaultRadiusMetres) || 0;
  const example = estimateDetectedTemperature(meta, 40, Math.min(10, radius || 10), 22);
  const exampleDistance = Math.min(10, radius || 10);

  return (
    <div className="spec-card">
      <div className="spec-card-title">{meta.rangeClass} specification</div>
      <div className="spec-grid">
        <span>Detection range</span><strong>{radius} m</strong>
        {meta.minTemperatureC !== undefined && <><span>Temperature span</span><strong>{meta.minTemperatureC}°C to {meta.maxTemperatureC}°C</strong></>}
        {meta.accuracyC !== undefined && <><span>Accuracy</span><strong>±{meta.accuracyC}°C</strong></>}
        <span>Response time</span><strong>{meta.responseTimeSeconds}s</strong>
        {meta.fieldOfViewDegrees && <><span>Field of view</span><strong>{meta.fieldOfViewDegrees}°</strong></>}
        {meta.resolution && <><span>Resolution</span><strong>{meta.resolution}</strong></>}
      </div>
      {example && (
        <p className="hint spec-example">
          Example: a 40°C heat source {exampleDistance} m away in 22°C ambient air is estimated at {example.detectedTemperatureC}°C
          {example.inRange ? ` (${example.deltaFromAmbientC}°C above ambient).` : ' because it is outside the selected range.'}
        </p>
      )}
    </div>
  );
}

function TabBar({ active, onChange }) {
  return (
    <div className="sensor-tabs">
      {['Place', 'Edit', 'Coverage'].map((t) => (
        <button
          key={t}
          className={`sensor-tab ${active === t ? 'active' : ''}`}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ---- Place tab ----
function PlaceTab({ sensors, selectedSensor, interactionMode, onTogglePlaceMode, onSelect, onClearAll, selectedTypeForPlace, onSelectedTypeChange }) {
  const placing = interactionMode === 'place';

  return (
    <div>
      <Field label="Sensor type to place">
        <select value={selectedTypeForPlace} onChange={(e) => onSelectedTypeChange(e.target.value)}>
          {SENSOR_TYPES.map((t) => (
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>
      </Field>
      <p className="hint">
        {getSensorTypeMeta(selectedTypeForPlace).guidance}
      </p>
      <SensorSpecCard sensorType={selectedTypeForPlace} />
      <button
        className={placing ? 'btn btn-active' : 'btn btn-primary'}
        style={{ width: '100%', margin: '10px 0' }}
        onClick={onTogglePlaceMode}
      >
        {placing ? 'Placing… click model to drop sensor' : '+ Place sensor on model'}
      </button>

      {sensors.length === 0 ? (
        <p className="muted">No sensors yet. Place a sensor above, then click the 3D model.</p>
      ) : (
        <>
          <p className="info-label" style={{ marginBottom: 4 }}>Placed sensors ({sensors.length})</p>
          <ul className="sensor-list">
            {sensors.map((s) => {
              const meta = getSensorTypeMeta(s.type);
              return (
                <li
                  key={s.id}
                  className={s.id === selectedSensor?.id ? 'sensor-item selected' : 'sensor-item'}
                  onClick={() => onSelect(s.id)}
                >
                  <span className="dot" style={{ background: meta.color }} />
                  <span className="sensor-name">{s.name}</span>
                  <span className="sensor-meta">{s.type} · {s.coverageRadiusMetres} m</span>
                </li>
              );
            })}
          </ul>
          <button className="btn btn-danger-ghost btn-small" style={{ marginTop: 6 }} onClick={onClearAll}>
            Clear all sensors
          </button>
        </>
      )}
    </div>
  );
}

// ---- Edit tab ----
function EditTab({ selectedSensor, onUpdate, onDelete }) {
  const [savedFlash, setSavedFlash] = useState(false);

  if (!selectedSensor) {
    return <p className="muted">Select a sensor from the Place tab to edit its properties.</p>;
  }

  const set = (patch) => onUpdate(selectedSensor.id, patch);
  const setPosition = (axis, value) => {
    const next = parseFloat(value);
    if (Number.isNaN(next)) return;
    set({ position: { ...selectedSensor.position, [axis]: next } });
  };
  const nudgePosition = (axis, amount) => {
    const current = Number(selectedSensor.position?.[axis]) || 0;
    set({ position: { ...selectedSensor.position, [axis]: Number((current + amount).toFixed(2)) } });
  };

  const handleTypeChange = (type) => {
    const meta = getSensorTypeMeta(type);
    set({ type, riskCategory: meta.riskCategory, coverageRadiusMetres: meta.defaultRadiusMetres });
  };

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <div className="sensor-form">
      <p className="hint" style={{ marginBottom: 8 }}>
        Editing: <strong>{selectedSensor.id}</strong>
      </p>
      <SensorSpecCard sensorType={selectedSensor.type} coverageRadiusMetres={selectedSensor.coverageRadiusMetres} />

      <Field label="Sensor name">
        <input value={selectedSensor.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>

      <div className="field-grid">
        <Field label="Sensor type">
          <select value={selectedSensor.type} onChange={(e) => handleTypeChange(e.target.value)}>
            {SENSOR_TYPES.map((t) => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Coverage radius (m)">
          <input
            type="number" min="0" step="0.5"
            value={selectedSensor.coverageRadiusMetres}
            onChange={(e) => set({ coverageRadiusMetres: parseFloat(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <div className="field-grid">
        <Field label="Sensitivity">
          <select value={selectedSensor.sensitivity} onChange={(e) => set({ sensitivity: e.target.value })}>
            {SENSITIVITY_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={selectedSensor.status} onChange={(e) => set({ status: e.target.value })}>
            {SENSOR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div className="field-grid">
        <Field label="Linked zone">
          <input value={selectedSensor.linkedZone}
            onChange={(e) => set({ linkedZone: e.target.value })} placeholder="e.g. Plant Room" />
        </Field>
        <Field label="Installation priority">
          <select value={selectedSensor.installationPriority}
            onChange={(e) => set({ installationPriority: e.target.value })}>
            {INSTALLATION_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Risk category">
        <select value={selectedSensor.riskCategory} onChange={(e) => set({ riskCategory: e.target.value })}>
          {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <div className="position-editor">
        <p className="info-label" style={{ marginBottom: 4 }}>Fine tune position</p>
        <div className="position-grid">
          {['x', 'y', 'z'].map((axis) => (
            <Field key={axis} label={`${axis.toUpperCase()} position`}>
              <input
                type="number"
                step="0.1"
                value={selectedSensor.position[axis].toFixed(2)}
                onChange={(e) => setPosition(axis, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <div className="nudge-grid" aria-label="Sensor position nudge controls">
          <button className="btn btn-small" onClick={() => nudgePosition('x', -0.25)}>X −</button>
          <button className="btn btn-small" onClick={() => nudgePosition('x', 0.25)}>X +</button>
          <button className="btn btn-small" onClick={() => nudgePosition('y', -0.25)}>Down</button>
          <button className="btn btn-small" onClick={() => nudgePosition('y', 0.25)}>Up</button>
          <button className="btn btn-small" onClick={() => nudgePosition('z', -0.25)}>Z −</button>
          <button className="btn btn-small" onClick={() => nudgePosition('z', 0.25)}>Z +</button>
        </div>
        <p className="hint">Use Up/Down for vertical movement after loading or reopening a saved project.</p>
      </div>

      <Field label="Notes">
        <textarea rows={2} value={selectedSensor.notes}
          onChange={(e) => set({ notes: e.target.value })} />
      </Field>

      <label className="toggle-row">
        <input type="checkbox" checked={selectedSensor.coverageVisible}
          onChange={(e) => set({ coverageVisible: e.target.checked })} />
        Show coverage zone in 3D view
      </label>

      <p className="hint">
        Position: x {selectedSensor.position.x.toFixed(2)}, y {selectedSensor.position.y.toFixed(2)},
        z {selectedSensor.position.z.toFixed(2)}
      </p>

      <div className="field-row">
        <button className="btn btn-primary btn-small" onClick={flashSaved}>
          {savedFlash ? 'Saved ✓' : 'Save changes'}
        </button>
        <button className="btn btn-danger btn-small" onClick={() => onDelete(selectedSensor.id)}>
          Delete
        </button>
      </div>
      <p className="hint">Changes apply live and auto-save in your browser.</p>
    </div>
  );
}

// ---- Coverage tab ----
function CoverageTab({ sensors, projectSettings, onChangeSettings }) {
  const { zoneName, requiredAreaM2, coverageSensorType } = projectSettings;
  const requiredArea = Number(requiredAreaM2) || 0;

  const filtered = sensors.filter((s) => coverageSensorType === 'All' || s.type === coverageSensorType);
  const totalCoverage = calculateTotalCoverageArea(sensors, coverageSensorType);
  const pct = calculateCoveragePercentage(totalCoverage, requiredArea);
  const status = calculateCoverageStatus(pct);
  const gaps = identifyCoverageGaps(sensors, zoneName, coverageSensorType);
  const avgArea = filtered.length > 0
    ? totalCoverage / filtered.length
    : (() => {
        const r = coverageSensorType === 'All' ? 3 : getSensorTypeMeta(coverageSensorType).defaultRadiusMetres;
        return Math.PI * r * r;
      })();
  const additional = estimateAdditionalSensorsNeeded(requiredArea, totalCoverage, avgArea);
  const recommendation = recommendAdditionalSensors(coverageSensorType, pct);

  const set = (patch) => onChangeSettings({ ...projectSettings, ...patch });

  const statusBadge = (s) => {
    switch (s) {
      case 'Poor coverage':    return 'badge badge-high';
      case 'Partial coverage': return 'badge badge-medium';
      case 'Good coverage':    return 'badge badge-good';
      default:                 return 'badge badge-low';
    }
  };

  return (
    <div>
      <div className="field-grid">
        <div className="field">
          <label>Selected zone</label>
          <input value={zoneName} onChange={(e) => set({ zoneName: e.target.value })} />
        </div>
        <div className="field">
          <label>Required area (m²)</label>
          <input type="number" min="0" value={requiredAreaM2}
            onChange={(e) => set({ requiredAreaM2: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label>Sensor type filter</label>
        <select value={coverageSensorType} onChange={(e) => set({ coverageSensorType: e.target.value })}>
          <option value="All">All sensor types</option>
          {SENSOR_TYPES.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
        </select>
      </div>

      <div className="info-row">
        <span className="info-label">Sensors counted</span>
        <span className="info-value">{filtered.length}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Total coverage</span>
        <span className="info-value">{totalCoverage.toFixed(2)} m²</span>
      </div>
      <div className="info-row">
        <span className="info-label">Coverage %</span>
        <span className="info-value">{requiredArea > 0 ? `${Math.min(pct, 999).toFixed(1)}%` : '—'}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Status</span>
        <span className={statusBadge(status)}>{requiredArea > 0 ? status : 'Set required area'}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Suggested additional</span>
        <span className="info-value">{requiredArea > 0 ? additional : '—'}</span>
      </div>

      {gaps.length > 0 && (
        <div className="gap-list">
          <span className="info-label">Coverage gaps</span>
          <ul>{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </div>
      )}

      {requiredArea > 0 && <p className="recommendation-text">{recommendation}</p>}

      {filtered.length > 0 && (
        <details className="details" style={{ marginTop: 10 }}>
          <summary>Per-sensor coverage</summary>
          <ul className="plain-list">
            {filtered.map((s) => (
              <li key={s.id}>
                {s.name}: {calculateSensorCoverageArea(s).toFixed(2)} m²
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ---- Main export ----
export default function SensorPanel({
  sensors,
  selectedSensor,
  interactionMode,
  projectSettings,
  onSelect,
  onUpdate,
  onDelete,
  onTogglePlaceMode,
  onClearAll,
  onChangeProjectSettings,
  selectedTypeForPlace,
  onSelectedTypeChange,
}) {
  const [activeTab, setActiveTab] = useState('Place');

  return (
    <section className="card">
      <h2 className="card-title">Virtual sensors</h2>
      <TabBar active={activeTab} onChange={setActiveTab} />

      <div className="tab-body">
        {activeTab === 'Place' && (
          <PlaceTab
            sensors={sensors}
            selectedSensor={selectedSensor}
            interactionMode={interactionMode}
            onTogglePlaceMode={onTogglePlaceMode}
            onSelect={onSelect}
            onClearAll={onClearAll}
            selectedTypeForPlace={selectedTypeForPlace}
            onSelectedTypeChange={onSelectedTypeChange}
          />
        )}
        {activeTab === 'Edit' && (
          <EditTab
            selectedSensor={selectedSensor}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        )}
        {activeTab === 'Coverage' && (
          <CoverageTab
            sensors={sensors}
            projectSettings={projectSettings}
            onChangeSettings={onChangeProjectSettings}
          />
        )}
      </div>
    </section>
  );
}
