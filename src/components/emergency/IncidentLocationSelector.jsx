// Step 2 — select the incident origin point on the model or enter coordinates manually.

import { useState } from 'react';

export default function IncidentLocationSelector({
  incidentPoint,
  interactionMode,
  sensors,
  scaleFactor,
  onStartPlacement,
  onClearLocation,
  onManualCoords,
}) {
  const [manual, setManual] = useState({ x: '', y: '', z: '' });
  const placing = interactionMode === 'incident';

  const setManualCoord = (axis, val) => setManual((p) => ({ ...p, [axis]: val }));

  const applyManual = () => {
    const x = parseFloat(manual.x);
    const y = parseFloat(manual.y);
    const z = parseFloat(manual.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
    onManualCoords({ x, y, z });
  };

  // Nearest sensor to the incident point
  const nearbySensors = incidentPoint
    ? sensors
        .map((s) => {
          const dx = s.position.x - incidentPoint.x;
          const dy = s.position.y - incidentPoint.y;
          const dz = s.position.z - incidentPoint.z;
          return { ...s, distM: +(Math.sqrt(dx * dx + dy * dy + dz * dz) * scaleFactor).toFixed(1) };
        })
        .sort((a, b) => a.distM - b.distM)
        .slice(0, 4)
    : [];

  return (
    <div className="incident-location-panel">
      {incidentPoint ? (
        <div className="incident-set">
          <div className="incident-coords-badge">
            <span className="badge badge-low">Location set</span>
            <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
              x {incidentPoint.x.toFixed(2)} · y {incidentPoint.y.toFixed(2)} · z {incidentPoint.z.toFixed(2)}
            </span>
          </div>
          <p className="hint" style={{ marginTop: 6 }}>
            Incident marker is shown in the 3D viewer. Click below to change the location.
          </p>
          <button className="btn btn-small" onClick={onStartPlacement} style={{ marginRight: 8 }}>
            {placing ? 'Click model to reposition…' : 'Reposition marker'}
          </button>
          <button className="btn btn-small btn-danger-ghost" onClick={onClearLocation}>
            Clear
          </button>

          {nearbySensors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p className="info-label">Nearby sensors</p>
              <ul className="plain-list">
                {nearbySensors.map((s) => (
                  <li key={s.id} style={{ padding: '3px 0' }}>
                    {s.name} <span className="muted">({s.type})</span>
                    <span style={{ float: 'right' }}>{s.distM} m</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="muted" style={{ marginBottom: 12 }}>
            Set where the emergency originates inside or near the building model.
          </p>
          <button
            className={placing ? 'btn btn-active' : 'btn btn-primary'}
            style={{ width: '100%', marginBottom: 14 }}
            onClick={onStartPlacement}
          >
            {placing
              ? 'Click anywhere on the 3D model to place the marker…'
              : 'Click model to place incident marker'}
          </button>

          <p className="info-label" style={{ marginBottom: 6 }}>Or enter coordinates manually</p>
          <div className="field-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {['x', 'y', 'z'].map((axis) => (
              <div key={axis} className="field">
                <label style={{ textTransform: 'uppercase' }}>{axis}</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={manual[axis]}
                  onChange={(e) => setManualCoord(axis, e.target.value)}
                />
              </div>
            ))}
          </div>
          <button className="btn btn-small" style={{ marginTop: 6 }} onClick={applyManual}>
            Apply coordinates
          </button>
        </div>
      )}
    </div>
  );
}
