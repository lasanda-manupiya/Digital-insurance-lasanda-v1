// Results dashboard — shown after simulation completes.
// Displays summary cards, detailed findings, sensor response, and recommendations.

import { riskBadgeClass } from '../../utils/impactColourUtils.js';
import { IMPACT_LEVELS } from '../../utils/impactColourUtils.js';

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="result-summary-card" style={{ borderColor: color ?? 'var(--card-border)' }}>
      <div className="rsc-value" style={{ color: color ?? 'var(--text)' }}>{value}</div>
      <div className="rsc-label">{label}</div>
      {sub && <div className="rsc-sub">{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="result-section">
      <h4 className="result-section-title">{title}</h4>
      {children}
    </section>
  );
}

function Row({ label, value, badge }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      {badge
        ? <span className={`badge ${badge}`}>{value}</span>
        : <span className="info-value">{value}</span>}
    </div>
  );
}

function formatTime(seconds) {
  if (seconds == null) return 'N/A';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function PriorityBadge({ priority }) {
  const cls = priority === 'High' ? 'badge badge-high'
    : priority === 'Medium' ? 'badge badge-medium' : 'badge badge-low';
  return <span className={cls}>{priority}</span>;
}

export default function ResultsPanel({ simulationResult, onViewIn3D, onReset }) {
  if (!simulationResult) {
    return (
      <div className="card">
        <h2 className="card-title">Simulation results</h2>
        <p className="muted">No simulation has been run yet. Use the Emergency tab to configure and run a simulation.</p>
      </div>
    );
  }

  const s = simulationResult;
  const fs = s.finalSummary;
  const riskColor = fs.riskLevel === 'High' ? '#ef4444'
    : fs.riskLevel === 'Medium' ? '#f97316' : '#4ade80';

  const activations = (s.frames?.[s.frames.length - 1]?.sensorActivations ?? []);
  const activated   = activations.filter((a) => ['Activated', 'Ringing'].includes(a.status));
  const outOfRange  = activations.filter((a) => a.status === 'Out of range');
  const unsuitable  = activations.filter((a) => a.status === 'Unsuitable');

  return (
    <div className="results-panel">
      {/* Header */}
      <div className="results-header">
        <div>
          <h2 className="card-title" style={{ marginBottom: 2 }}>Simulation results</h2>
          <p className="muted" style={{ fontSize: 12 }}>
            {s.scenarioLabel} · {s.incidentLocationLabel} ·{' '}
            {new Date(s.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <span className={riskBadgeClass(fs.riskLevel)} style={{ alignSelf: 'flex-start' }}>
          {fs.riskLevel} risk
        </span>
      </div>

      {/* Summary cards */}
      <div className="result-summary-grid">
        <SummaryCard label="People affected" value={fs.affectedPeople}
          sub={`${fs.inCriticalZone} in critical zone`} color={riskColor} />
        <SummaryCard label="Sensors activated" value={fs.activatedSensors}
          sub={`First at ${formatTime(fs.firstDetectionTime)}`} color="#4ade80" />
        <SummaryCard label="Blocked routes"   value={fs.blockedRoutes}
          color={fs.blockedRoutes > 0 ? '#ef4444' : '#4ade80'} />
        <SummaryCard label="Available exits"  value={fs.availableExits}
          color={fs.availableExits > 0 ? '#4ade80' : '#ef4444'} />
      </div>

      {/* View in 3D + reset buttons */}
      <div className="field-row" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary btn-small" onClick={onViewIn3D}>
          View in 3D viewer
        </button>
        <button className="btn btn-small" onClick={onReset}>
          New simulation
        </button>
      </div>

      {/* Occupancy impact */}
      <Section title="Occupancy impact">
        <Row label="Total people"     value={s.occupancy?.totalPeople ?? '—'} />
        <Row label="Affected"         value={fs.affectedPeople} />
        <Row label="In critical zone" value={fs.inCriticalZone} badge={fs.inCriticalZone > 0 ? 'badge-high' : 'badge-low'} />
        <Row label="Evacuating"       value={fs.evacuatingPeople} />
        <Row label="Trapped / delayed" value={fs.trappedPeople}
          badge={fs.trappedPeople > 0 ? 'badge-high' : 'badge-low'} />
        <Row label="Need assistance"  value={s.occupancy?.mobilityLimited ?? 0} />
      </Section>

      {/* Sensor response */}
      <Section title="Sensor response">
        <Row label="Total sensors"     value={activations.length} />
        <Row label="Activated"         value={activated.length}
          badge={activated.length > 0 ? 'badge-low' : 'badge-gap'} />
        <Row label="Out of range"      value={outOfRange.length}
          badge={outOfRange.length > 0 ? 'badge-medium' : null} />
        <Row label="Unsuitable type"   value={unsuitable.length} />
        <Row label="First detection"   value={formatTime(fs.firstDetectionTime)}
          badge={fs.firstDetectionTime == null ? 'badge-gap' : null} />
        {activated.length > 0 && (
          <ul className="plain-list" style={{ marginTop: 8 }}>
            {activated.map((a) => (
              <li key={a.sensorId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{a.sensorName}</span>
                <span className="muted">{a.status === 'Ringing' ? 'ringing' : 'activated'} at {formatTime(a.activationTime)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Evacuation summary */}
      <Section title="Evacuation summary">
        <Row label="Known exits"      value={fs.availableExits}   badge={fs.availableExits === 0 ? 'badge-gap' : null} />
        <Row label="Blocked routes"   value={fs.blockedRoutes}    badge={fs.blockedRoutes > 0 ? 'badge-high' : 'badge-low'} />
        <Row label="Confidence"       value={fs.simulationConfidence} badge={
          fs.simulationConfidence === 'Low' ? 'badge-high' :
          fs.simulationConfidence === 'Medium' ? 'badge-medium' : 'badge-low'} />
      </Section>

      {/* Recommendations */}
      {fs.recommendations?.length > 0 && (
        <Section title="Recommendations">
          <ul className="rec-list" style={{ listStyle: 'none', padding: 0 }}>
            {fs.recommendations.map((r, i) => (
              <li key={i} className="rec-item" style={{ marginBottom: 8 }}>
                <div className="rec-head">
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.text}</span>
                  <PriorityBadge priority={r.priority} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Data limitations */}
      <Section title="Data quality and limitations">
        <div className="info-row">
          <span className="info-label">Simulation confidence</span>
          <span className={riskBadgeClass(
            fs.simulationConfidence === 'Low' ? 'High' :
            fs.simulationConfidence === 'Medium' ? 'Medium' : 'Low'
          )}>{fs.simulationConfidence}</span>
        </div>
        <ul className="plain-list" style={{ marginTop: 8 }}>
          {(fs.dataLimitations ?? []).map((l, i) => (
            <li key={i} style={{ color: 'var(--amber)', fontSize: 12, padding: '2px 0' }}>
              {l}
            </li>
          ))}
        </ul>
      </Section>

      {/* Disclaimer */}
      <div className="disclaimer-box">
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5 }}>
          <strong>Disclaimer:</strong> {s.disclaimer}
        </p>
      </div>
    </div>
  );
}
