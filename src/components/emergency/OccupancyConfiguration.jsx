// Step 4 — configure building occupancy for the simulation.

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <p className="hint" style={{ marginTop: 3 }}>{hint}</p>}
    </div>
  );
}

export default function OccupancyConfiguration({ occupancy, onOccupancyChange }) {
  const set = (patch) => onOccupancyChange({ ...occupancy, ...patch });

  return (
    <div>
      <div className="field-grid">
        <Field label="Total people in building">
          <input
            type="number" min="1" max="10000"
            value={occupancy.totalPeople}
            onChange={(e) => set({ totalPeople: Number(e.target.value) || 1 })}
          />
        </Field>
        <Field label="Mobility-limited occupants"
          hint="People who need evacuation assistance.">
          <input
            type="number" min="0"
            value={occupancy.mobilityLimited}
            onChange={(e) => set({ mobilityLimited: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <div className="field-grid">
        <Field label="Staff">
          <input
            type="number" min="0"
            value={occupancy.staff}
            onChange={(e) => set({ staff: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Visitors">
          <input
            type="number" min="0"
            value={occupancy.visitors}
            onChange={(e) => set({ visitors: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <Field label="Average movement speed (m/s)"
        hint="Typical walking speed is 1.0–1.4 m/s. Reduce for stairs or congestion.">
        <input
          type="number" min="0.1" max="3" step="0.1"
          value={occupancy.averageMovementSpeed}
          onChange={(e) => set({ averageMovementSpeed: parseFloat(e.target.value) || 1.2 })}
        />
      </Field>

      <div className="occupancy-summary">
        <div className="info-row">
          <span className="info-label">Total people</span>
          <span className="info-value">{occupancy.totalPeople}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Mobility-limited</span>
          <span className="info-value">{occupancy.mobilityLimited}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Movement speed</span>
          <span className="info-value">{occupancy.averageMovementSpeed} m/s</span>
        </div>
        <div className="info-row">
          <span className="info-label">Data basis</span>
          <span className="badge badge-medium">Estimated</span>
        </div>
      </div>

      <p className="hint" style={{ marginTop: 10 }}>
        Occupancy is distributed uniformly for this indicative simulation.
        Import actual occupancy data in a future release for higher accuracy.
      </p>
    </div>
  );
}
