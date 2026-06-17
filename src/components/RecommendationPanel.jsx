import { riskBadgeClass } from './ScenarioPanel.jsx';
import { identifyDataGaps } from '../utils/riskEngine.js';

export default function RecommendationPanel({ results, sensors }) {
  const dataGaps = identifyDataGaps(sensors);

  return (
    <section className="card">
      <h2 className="card-title">Recommendations</h2>
      {results.length === 0 ? (
        <p className="muted">Run scenarios to generate evidence-based recommendations.</p>
      ) : (
        <ul className="plain-list rec-list">
          {results.map((r) => (
            <li key={r.scenarioId} className="rec-item">
              <div className="rec-head">
                <strong>{r.scenarioName}</strong>
                <span className={riskBadgeClass(r.riskLevel)}>{r.riskLevel}</span>
              </div>
              <p>{r.recommendation}</p>
              <p className="quotation-impact">{r.quotationImpact}</p>
            </li>
          ))}
        </ul>
      )}

      {dataGaps.length > 0 && (
        <div className="gap-list">
          <span className="info-label">Data gaps across all risk domains</span>
          <ul>
            {dataGaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}

      {results.length > 0 && (
        <p className="hint">
          If high-risk recommendations are implemented and re-modelled, risk levels can reduce and
          quotation value may decrease.
        </p>
      )}
    </section>
  );
}
