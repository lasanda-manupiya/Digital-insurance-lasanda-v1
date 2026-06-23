import { useMemo, useState } from 'react';
import { manualTagTypes, riskCategories, CHECKLIST_STATUSES } from '../data/insuranceRiskChecklist.js';
import { assessRiskCategory, getMartynTier } from '../utils/insuranceRiskEngine.js';

function statusClass(status) {
  if (status === 'Covered') return 'badge badge-low';
  if (status === 'Partially covered') return 'badge badge-medium';
  if (status === 'Not applicable') return 'badge badge-good';
  if (status === 'Evidence required' || status === 'Manual review required') return 'badge badge-gap';
  return 'badge badge-high';
}

export default function InsuranceRiskChecklistPanel({ sensors, manualTags, pendingTagPoint, modelInfo, projectSettings, occupancyConfig, onStartTagging, onAddManualTag, onDeleteManualTag, onUpdateOccupancy }) {
  const [activeId, setActiveId] = useState('fire');
  const [newTagType, setNewTagType] = useState(manualTagTypes[0]);
  const [newTagLabel, setNewTagLabel] = useState('');
  const occupancy = Number(occupancyConfig?.totalOccupants || occupancyConfig?.maxOccupancy || projectSettings?.maximumOccupancy || 0);
  const assessment = useMemo(() => assessRiskCategory(activeId, { sensors, manualTags, modelInfo, projectSettings, occupancyConfig }), [activeId, sensors, manualTags, modelInfo, projectSettings, occupancyConfig]);
  const tier = getMartynTier(occupancy);

  const addTag = () => {
    if (!pendingTagPoint) return;
    onAddManualTag({ type:newTagType, label:newTagLabel || newTagType, position:pendingTagPoint });
    setNewTagLabel('');
  };

  return <section className="card insurance-panel">
    <h2 className="card-title">Insurance Risk Checklist</h2>
    <p className="hint">Insurance readiness, risk visualisation, scenario based risk assessment, evidence support, readiness score, protection coverage, and risk reduction estimate. Final compliance, safety, legal, and insurance decisions require review by qualified professionals, insurers, fire safety consultants, security consultants, or legal advisers.</p>

    <div className="risk-tabs">
      {riskCategories.map((c) => <button key={c.categoryId} className={`risk-tab ${activeId === c.categoryId ? 'active' : ''}`} onClick={() => setActiveId(c.categoryId)}>{c.buttonLabel}</button>)}
    </div>

    <h3 className="section-title">{assessment.category.categoryName}</h3>
    <p className="muted">{assessment.category.description}</p>
    {activeId === 'martyn' && <div className="recommendation-text"><strong>{tier.label}</strong><br />{tier.detail}</div>}

    <div className="score-grid">
      <div><span>Initial risk score</span><strong>{assessment.initialScore}/100</strong></div>
      <div><span>Current risk score</span><strong>{assessment.currentScore}/100</strong></div>
      <div><span>Risk reduction estimate</span><strong>{assessment.riskReductionPercentage}%</strong></div>
    </div>

    {activeId === 'martyn' && <div className="field"><label>Maximum expected occupancy</label><input type="number" min="0" value={occupancy || ''} onChange={(e) => onUpdateOccupancy({ ...occupancyConfig, totalOccupants: Number(e.target.value) || 0 })} placeholder="Enter occupancy for readiness tier" /></div>}

    <details className="details" open><summary>Manual tagging and evidence support</summary>
      <p className="hint">If BIM metadata is incomplete, click “Select location”, click the model, choose a tag type, then save it. Tags are saved in local project state and included in scoring.</p>
      <div className="field-grid"><div className="field"><label>Tag type</label><select value={newTagType} onChange={(e)=>setNewTagType(e.target.value)}>{manualTagTypes.map((t)=><option key={t}>{t}</option>)}</select></div><div className="field"><label>Label</label><input value={newTagLabel} onChange={(e)=>setNewTagLabel(e.target.value)} placeholder="Optional asset label" /></div></div>
      <div className="field-row"><button className="btn btn-primary btn-small" onClick={onStartTagging}>Select location in 3D</button><button className="btn btn-small" disabled={!pendingTagPoint} onClick={addTag}>Save manual tag</button></div>
      {pendingTagPoint && <p className="hint">Pending location: x {pendingTagPoint.x.toFixed(2)}, y {pendingTagPoint.y.toFixed(2)}, z {pendingTagPoint.z.toFixed(2)}</p>}
      {manualTags.length > 0 && <ul className="plain-list">{manualTags.map((t)=><li key={t.id}>{t.label} ({t.type}) <button className="link-btn" onClick={()=>onDeleteManualTag(t.id)}>remove</button></li>)}</ul>}
    </details>

    <div className="info-row"><span className="info-label">Detected model elements</span><span className="info-value">{assessment.evidence.length}</span></div>
    <div className="gap-list"><span className="info-label">Missing elements</span><ul>{(assessment.missingElements.length ? assessment.missingElements : ['No high-priority missing model elements detected for this category.']).map((m)=><li key={m}>{m}</li>)}</ul></div>

    <h3 className="section-title">Checklist items</h3>
    <div className="checklist-list">{assessment.items.map((it)=><div className="checklist-item" key={it.id}><div className="checklist-head"><strong>{it.label}</strong><span className={statusClass(it.status)}>{it.status}</span></div><p className="hint">{it.description}</p><p className="hint">Detected evidence: {it.detectedEvidence.length ? it.detectedEvidence.map((e)=>e.label).join(', ') : 'None recorded'}</p><p className="recommendation-text">{it.recommendation}</p></div>)}</div>

    <h3 className="section-title">Top remaining risks and next improvements</h3>
    <ul className="plain-list">{assessment.topRemainingRisks.map((r)=><li key={r.id}><strong>{r.label}</strong>: {r.recommendation}</li>)}</ul>
    <p className="hint">Supported statuses: {CHECKLIST_STATUSES.join(', ')}.</p>
  </section>;
}
