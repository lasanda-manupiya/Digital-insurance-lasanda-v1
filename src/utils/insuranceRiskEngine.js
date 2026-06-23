import { riskCategories } from '../data/insuranceRiskChecklist.js';

const STATUS_RISK = { 'Covered': 0.15, 'Partially covered': 0.5, 'Not covered': 1, 'Evidence required': 0.75, 'Manual review required': 0.85, 'Not applicable': 0 };
const norm = (v) => String(v || '').toLowerCase();
const hasMatch = (haystack, needles) => needles.some((n) => haystack.includes(norm(n)) || norm(n).includes(haystack));

export function getMartynTier(occupancy = 0) {
  const n = Number(occupancy) || 0;
  if (n < 200) return { label: 'Outside standard threshold based on occupancy input', detail: 'Voluntary readiness assessment remains available. Likely applicability is subject to legal review.' };
  if (n < 800) return { label: 'Standard tier readiness workflow', detail: 'Focus on notification readiness, evacuation, invacuation, lockdown, communications, staff awareness, and basic procedural readiness.' };
  return { label: 'Enhanced tier readiness workflow', detail: 'Includes documented protective measures, physical vulnerability reduction, access control, CCTV, vehicle mitigation, crowd protection, and evidence pack preparation.' };
}

export function buildEvidenceIndex({ sensors = [], manualTags = [], modelInfo = null, projectSettings = {}, occupancyConfig = {} }) {
  const sensorEvidence = sensors.map((s) => ({ id:s.id, label:s.name || s.type, type:s.type, position:s.position, source:'Virtual sensor' }));
  const tagEvidence = manualTags.map((t) => ({ id:t.id, label:t.label || t.type, type:t.type, position:t.position, source:'Manual tag' }));
  const manualEvidence = [];
  if (Number(occupancyConfig.totalOccupants || occupancyConfig.maxOccupancy || projectSettings.maximumOccupancy) > 0) manualEvidence.push({ id:'occupancy', label:'Maximum expected occupancy entered', type:'manual', source:'Manual input' });
  if (modelInfo) manualEvidence.push({ id:'model', label:modelInfo.fileName || 'Loaded model', type:'model', source:'3D model' });
  return [...sensorEvidence, ...tagEvidence, ...manualEvidence];
}

export function assessRiskCategory(categoryId, context) {
  const category = riskCategories.find((c) => c.categoryId === categoryId) || riskCategories[0];
  const evidence = buildEvidenceIndex(context);
  const assessedItems = category.items.map((it) => {
    const matches = evidence.filter((e) => hasMatch(norm(e.type) + ' ' + norm(e.label), it.detectedModelTypes || []));
    let status = matches.length > 0 ? 'Covered' : (it.manualInputRequired ? 'Evidence required' : 'Not covered');
    if (matches.length === 1 && /(coverage|routes|checked|identified)/i.test(it.label)) status = 'Partially covered';
    if (/manual review/i.test(it.label) && matches.length === 0) status = 'Manual review required';
    return { ...it, status, detectedEvidence: matches, manualOverride: null, relatedModelElements: matches, riskImpact: it.weight * (STATUS_RISK[status] ?? 1) };
  });
  const totalWeight = assessedItems.reduce((s, i) => s + i.weight, 0) || 1;
  const score = Math.round((assessedItems.reduce((s, i) => s + i.weight * (STATUS_RISK[i.status] ?? 1), 0) / totalWeight) * 100);
  const initialScore = Math.round((assessedItems.reduce((s, i) => s + i.weight * (i.manualInputRequired ? STATUS_RISK['Evidence required'] : STATUS_RISK['Not covered']), 0) / totalWeight) * 100);
  const topRemainingRisks = assessedItems.filter((i) => !['Covered','Not applicable'].includes(i.status)).sort((a,b)=>b.riskImpact-a.riskImpact).slice(0,5);
  const missingElements = [...new Set(topRemainingRisks.flatMap((i) => i.detectedModelTypes || []).filter((x) => x !== 'manual'))];
  return { category, items: assessedItems, evidence, initialScore, currentScore: score, riskReduction: Math.max(0, initialScore - score), riskReductionPercentage: initialScore ? Math.round(((initialScore - score) / initialScore) * 100) : 0, topRemainingRisks, missingElements };
}

export function buildRiskOverlays(assessment) {
  return assessment.evidence.filter((e) => e.position).map((e) => ({ id:e.id, type:e.type, label:e.label, position:e.position, status: /cctv|camera/i.test(e.type) ? 'Partial' : 'Covered', radius: /cctv|camera/i.test(e.type) ? 8 : 5 }));
}
