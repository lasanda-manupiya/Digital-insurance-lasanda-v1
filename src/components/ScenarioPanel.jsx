import { DEFAULT_SCENARIOS } from '../data/defaultScenarios.js';

export function riskBadgeClass(level) {
  switch (level) {
    case 'High': return 'badge badge-high';
    case 'Medium': return 'badge badge-medium';
    case 'Low': return 'badge badge-low';
    default: return 'badge badge-gap';
  }
}

export default function ScenarioPanel({ results, onRunScenario, onRunAll, floodLevelMetres, onChangeFloodLevel }) {
  const resultFor = (id) => results.find((r) => r.scenarioId === id);

  return (
    <section className="card">
      <h2 className="card-title">Scenario modelling</h2>
      <div className="field-row">
        <button className="btn btn-primary" onClick={onRunAll}>Run all scenarios</button>
      </div>
      <div className="field">
        <label>Assumed flood level (metres above ground)</label>
        <input
          type="number"
          step="0.1"
          min="0"
          value={floodLevelMetres}
          onChange={(e) => onChangeFloodLevel(parseFloat(e.target.value) || 0)}
        />
      </div>

      <ul className="scenario-list">
        {DEFAULT_SCENARIOS.map((sc) => {
          const r = resultFor(sc.id);
          return (
            <li key={sc.id} className="scenario-item">
              <div className="scenario-head">
                <div>
                  <strong>{sc.name}</strong>
                  <p className="hint">{sc.description}</p>
                </div>
                <button className="btn btn-small" onClick={() => onRunScenario(sc.id)}>Run</button>
              </div>
              {r && (
                <div className="scenario-result">
                  <div className="info-row">
                    <span className="info-label">Risk level</span>
                    <span className={riskBadgeClass(r.riskLevel)}>{r.riskLevel}</span>
                  </div>
                  <p className="result-reason">{r.reason}</p>
                  <div className="info-row">
                    <span className="info-label">Coverage status</span>
                    <span className="info-value">{r.coverageStatus}</span>
                  </div>
                  {r.affectedSensors.length > 0 && (
                    <p className="hint">Affected sensors: {r.affectedSensors.join(', ')}</p>
                  )}
                  <p className="quotation-impact">{r.quotationImpact}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
