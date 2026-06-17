// Step 5 — compact pre-run review and the Run Simulation button.

const TYPE_LABELS = {
  fire:      'Fire',
  explosion: 'Explosion',
  riot:      'Riot / Unauthorised Entry',
  flood:     'Flood',
  gasLeak:   'Gas Leak',
};

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

export default function ScenarioReview({
  emergencyType,
  incidentPoint,
  params,
  occupancy,
  sensors,
  scaleFactor,
  simulationStatus,
  onRun,
}) {
  const canRun = !!emergencyType && !!incidentPoint && simulationStatus !== 'running';

  const nearbySensors = incidentPoint
    ? sensors.filter((s) => {
        const dx = s.position.x - incidentPoint.x;
        const dy = s.position.y - incidentPoint.y;
        const dz = s.position.z - incidentPoint.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) * scaleFactor <= 20;
      })
    : [];

  const accessSensors = sensors.filter((s) => s.type === 'Access Route Sensor');

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Row label="Emergency type"
          value={TYPE_LABELS[emergencyType] ?? emergencyType ?? '—'}
          badge={emergencyType ? null : 'badge-gap'} />
        <Row label="Incident location"
          value={incidentPoint
            ? `x ${incidentPoint.x.toFixed(1)}, y ${incidentPoint.y.toFixed(1)}, z ${incidentPoint.z.toFixed(1)}`
            : 'Not set'}
          badge={incidentPoint ? null : 'badge-high'} />
        <Row label="Duration"  value={`${(params?.durationSeconds ?? 600) / 60} min`} />
        <Row label="Occupancy" value={`${occupancy?.totalPeople ?? 50} people`} />
        <Row label="Sensors in range"
          value={nearbySensors.length > 0 ? `${nearbySensors.length} sensor(s)` : 'None in range'}
          badge={nearbySensors.length === 0 ? 'badge-medium' : null} />
        <Row label="Known exits (Access Route sensors)"
          value={accessSensors.length > 0 ? `${accessSensors.length} marked` : 'None marked'}
          badge={accessSensors.length === 0 ? 'badge-gap' : null} />
      </div>

      {!emergencyType && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 10 }}>
          Select an emergency type in step 1 before running.
        </p>
      )}
      {!incidentPoint && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 10 }}>
          Set an incident location in step 2 before running.
        </p>
      )}

      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '10px', fontSize: 14, fontWeight: 600 }}
        disabled={!canRun}
        onClick={onRun}
      >
        {simulationStatus === 'running' ? 'Running simulation…' : 'Run Emergency Simulation'}
      </button>

      <p className="hint" style={{ marginTop: 10, lineHeight: 1.5 }}>
        This simulation is indicative only. Results are for preliminary planning,
        visualisation and risk screening — not certified engineering analysis.
      </p>
    </div>
  );
}
