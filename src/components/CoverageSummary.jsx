import { SENSOR_TYPES, getSensorTypeMeta } from '../data/sensorTypes.js';
import {
  calculateSensorCoverageArea,
  calculateTotalCoverageArea,
  calculateCoveragePercentage,
  calculateCoverageStatus,
  estimateAdditionalSensorsNeeded,
  identifyCoverageGaps,
  recommendAdditionalSensors,
} from '../utils/coverageEngine.js';

function statusBadgeClass(status) {
  switch (status) {
    case 'Poor coverage': return 'badge badge-high';
    case 'Partial coverage': return 'badge badge-medium';
    case 'Good coverage': return 'badge badge-good';
    default: return 'badge badge-low';
  }
}

export default function CoverageSummary({ sensors, projectSettings, onChangeSettings }) {
  const { zoneName, requiredAreaM2, coverageSensorType } = projectSettings;
  const requiredArea = Number(requiredAreaM2) || 0;

  const filtered = sensors.filter(
    (s) => coverageSensorType === 'All' || s.type === coverageSensorType
  );
  const totalCoverage = calculateTotalCoverageArea(sensors, coverageSensorType);
  const pct = calculateCoveragePercentage(totalCoverage, requiredArea);
  const status = calculateCoverageStatus(pct);
  const gaps = identifyCoverageGaps(sensors, zoneName, coverageSensorType);

  // Average footprint of placed sensors of this type, or the type default if none exist yet.
  const avgArea =
    filtered.length > 0
      ? totalCoverage / filtered.length
      : (() => {
          const r = coverageSensorType === 'All' ? 3 : getSensorTypeMeta(coverageSensorType).defaultRadiusMetres;
          return Math.PI * r * r;
        })();
  const additional = estimateAdditionalSensorsNeeded(requiredArea, totalCoverage, avgArea);
  const recommendation = recommendAdditionalSensors(coverageSensorType, pct);

  const set = (patch) => onChangeSettings({ ...projectSettings, ...patch });

  return (
    <section className="card">
      <h2 className="card-title">Coverage summary</h2>

      <div className="field-grid">
        <div className="field">
          <label>Selected zone</label>
          <input value={zoneName} onChange={(e) => set({ zoneName: e.target.value })} />
        </div>
        <div className="field">
          <label>Required area (m²)</label>
          <input
            type="number"
            min="0"
            value={requiredAreaM2}
            onChange={(e) => set({ requiredAreaM2: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label>Sensor type</label>
        <select
          value={coverageSensorType}
          onChange={(e) => set({ coverageSensorType: e.target.value })}
        >
          <option value="All">All sensor types</option>
          {SENSOR_TYPES.map((t) => (
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="info-row">
        <span className="info-label">Sensors counted</span>
        <span className="info-value">{filtered.length}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Total estimated coverage</span>
        <span className="info-value">{totalCoverage.toFixed(2)} m²</span>
      </div>
      <div className="info-row">
        <span className="info-label">Coverage percentage</span>
        <span className="info-value">{requiredArea > 0 ? `${Math.min(pct, 999).toFixed(1)}%` : '—'}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Coverage status</span>
        <span className={statusBadgeClass(status)}>{requiredArea > 0 ? status : 'Set required area'}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Suggested additional sensors</span>
        <span className="info-value">{requiredArea > 0 ? additional : '—'}</span>
      </div>

      {gaps.length > 0 && (
        <div className="gap-list">
          <span className="info-label">Coverage gaps</span>
          <ul>
            {gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}

      {requiredArea > 0 && <p className="recommendation-text">{recommendation}</p>}

      {filtered.length > 0 && (
        <details className="details">
          <summary>Per-sensor coverage areas</summary>
          <ul className="plain-list">
            {filtered.map((s) => (
              <li key={s.id}>
                {s.name}: r {s.coverageRadiusMetres} m → {calculateSensorCoverageArea(s).toFixed(2)} m²
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
