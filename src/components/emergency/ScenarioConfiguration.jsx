// Step 3 — configure emergency-specific parameters.
// Only shows the fields relevant to the selected emergency type.

function Field({ label, children, hint }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <p className="hint" style={{ marginTop: 3 }}>{hint}</p>}
    </div>
  );
}

function Row({ children }) {
  return <div className="field-grid">{children}</div>;
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle-row" style={{ margin: '8px 0' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ---------- Fire ----------
function FireConfig({ params, set }) {
  return (
    <>
      <Row>
        <Select label="Fire intensity"  value={params.fireIntensity}  onChange={(v) => set({ fireIntensity: v })}
          options={['Low', 'Medium', 'High']} />
        <Select label="Growth rate"     value={params.growthRate}     onChange={(v) => set({ growthRate: v })}
          options={['Slow', 'Medium', 'Fast', 'Ultra-fast']} />
      </Row>
      <Row>
        <Select label="Smoke production" value={params.smokeProduction} onChange={(v) => set({ smokeProduction: v })}
          options={['Low', 'Medium', 'High']} />
        <Field label="Duration (seconds)">
          <input type="number" min="60" max="3600" step="60"
            value={params.durationSeconds}
            onChange={(e) => set({ durationSeconds: Number(e.target.value) || 600 })} />
        </Field>
      </Row>
      <Toggle label="Doors open (accelerates smoke spread)"
        checked={params.doorsOpen !== false} onChange={(v) => set({ doorsOpen: v })} />
      <Toggle label="Ventilation active"
        checked={params.ventilationActive !== false} onChange={(v) => set({ ventilationActive: v })} />
      <Toggle label="Sprinkler system available"
        checked={!!params.sprinklersAvailable} onChange={(v) => set({ sprinklersAvailable: v })} />
      <Toggle label="Alarm system available"
        checked={params.alarmAvailable !== false} onChange={(v) => set({ alarmAvailable: v })} />
    </>
  );
}

// ---------- Explosion ----------
function ExplosionConfig({ params, set }) {
  return (
    <>
      <Row>
        <Select label="Blast intensity" value={params.blastIntensity} onChange={(v) => set({ blastIntensity: v })}
          options={['Low', 'Medium', 'High']} />
        <Select label="Structural vulnerability" value={params.structuralVulnerability}
          onChange={(v) => set({ structuralVulnerability: v })} options={['Low', 'Medium', 'High']} />
      </Row>
      <Field label="Simulation duration (seconds)">
        <input type="number" min="30" max="3600" step="30"
          value={params.durationSeconds}
          onChange={(e) => set({ durationSeconds: Number(e.target.value) || 600 })} />
      </Field>
    </>
  );
}

// ---------- Riot ----------
function RiotConfig({ params, set }) {
  return (
    <>
      <Row>
        <Field label="Estimated crowd size">
          <input type="number" min="1" max="500"
            value={params.crowdSize}
            onChange={(e) => set({ crowdSize: Number(e.target.value) || 20 })} />
        </Field>
        <Select label="Movement speed" value={params.movementSpeed} onChange={(v) => set({ movementSpeed: v })}
          options={['Slow', 'Medium', 'Fast']} />
      </Row>
      <Field label="Security response time (minutes)"
        hint="Time from incident start until security personnel are on scene.">
        <input type="number" min="1" max="60"
          value={params.securityResponseTime}
          onChange={(e) => set({ securityResponseTime: Number(e.target.value) || 5 })} />
      </Field>
      <Field label="Duration (seconds)">
        <input type="number" min="60" max="3600" step="60"
          value={params.durationSeconds}
          onChange={(e) => set({ durationSeconds: Number(e.target.value) || 600 })} />
      </Field>
      <Toggle label="Lockdown protocol active"
        checked={!!params.lockdownActive} onChange={(v) => set({ lockdownActive: v })} />
    </>
  );
}

// ---------- Hostage ----------
function HostageConfig({ params, set }) {
  return (
    <>
      <Row>
        <Field label="Estimated hostages / occupants at risk">
          <input type="number" min="1" max="200"
            value={params.hostageCount}
            onChange={(e) => set({ hostageCount: Number(e.target.value) || 1 })} />
        </Field>
        <Select label="Incident movement" value={params.movementSpeed} onChange={(v) => set({ movementSpeed: v })}
          options={['Slow', 'Medium', 'Fast']} />
      </Row>
      <Field label="Security response time (minutes)"
        hint="Time from camera confirmation until trained responders are on scene.">
        <input type="number" min="1" max="60"
          value={params.securityResponseTime}
          onChange={(e) => set({ securityResponseTime: Number(e.target.value) || 5 })} />
      </Field>
      <Field label="Duration (seconds)">
        <input type="number" min="60" max="3600" step="60"
          value={params.durationSeconds}
          onChange={(e) => set({ durationSeconds: Number(e.target.value) || 600 })} />
      </Field>
      <Toggle label="Lockdown protocol active"
        checked={!!params.lockdownActive} onChange={(v) => set({ lockdownActive: v })} />
    </>
  );
}

// ---------- Flood ----------
function FloodConfig({ params, set }) {
  return (
    <>
      <Row>
        <Field label="Initial water depth (m)">
          <input type="number" min="0" max="5" step="0.05"
            value={params.initialDepth}
            onChange={(e) => set({ initialDepth: Number(e.target.value) || 0.1 })} />
        </Field>
        <Select label="Inflow rate" value={params.inflowRate} onChange={(v) => set({ inflowRate: v })}
          options={['Low', 'Medium', 'High']} />
      </Row>
      <Field label="Drainage capacity (m/min)"
        hint="How quickly drains can remove water. 0 = no drainage.">
        <input type="number" min="0" max="1" step="0.01"
          value={params.drainageCapacity}
          onChange={(e) => set({ drainageCapacity: Number(e.target.value) || 0 })} />
      </Field>
      <Field label="Duration (seconds)">
        <input type="number" min="60" max="3600" step="60"
          value={params.durationSeconds}
          onChange={(e) => set({ durationSeconds: Number(e.target.value) || 600 })} />
      </Field>
    </>
  );
}

// ---------- Gas Leak ----------
function GasLeakConfig({ params, set }) {
  return (
    <>
      <Row>
        <Select label="Gas type" value={params.gasType} onChange={(v) => set({ gasType: v })}
          options={['Natural Gas', 'LPG', 'Carbon Monoxide', 'Hydrogen', 'Ammonia', 'Unknown']} />
        <Select label="Leak rate" value={params.leakRate} onChange={(v) => set({ leakRate: v })}
          options={['Low', 'Medium', 'High']} />
      </Row>
      <Select label="Ventilation condition" value={params.ventilationCondition}
        onChange={(v) => set({ ventilationCondition: v })}
        options={['None', 'Poor', 'Normal', 'Good']} />
      <Field label="Duration (seconds)">
        <input type="number" min="60" max="3600" step="60"
          value={params.durationSeconds}
          onChange={(e) => set({ durationSeconds: Number(e.target.value) || 600 })} />
      </Field>
    </>
  );
}

// ---------- Default params per type ----------
export const DEFAULT_PARAMS = {
  fire:      { fireIntensity: 'Medium', growthRate: 'Medium', smokeProduction: 'Medium',
               durationSeconds: 600, doorsOpen: true, ventilationActive: true,
               sprinklersAvailable: false, alarmAvailable: true },
  explosion: { blastIntensity: 'Medium', structuralVulnerability: 'Medium', durationSeconds: 600 },
  riot:      { crowdSize: 20, movementSpeed: 'Medium', securityResponseTime: 5,
               durationSeconds: 600, lockdownActive: false },
  hostage:   { hostageCount: 1, movementSpeed: 'Slow', securityResponseTime: 5,
               durationSeconds: 600, lockdownActive: true },
  flood:     { initialDepth: 0.2, inflowRate: 'Medium', drainageCapacity: 0.01, durationSeconds: 600 },
  gasLeak:   { gasType: 'Natural Gas', leakRate: 'Medium', ventilationCondition: 'Normal', durationSeconds: 600 },
};

export default function ScenarioConfiguration({ emergencyType, params, onParamsChange }) {
  if (!emergencyType) return <p className="muted">Select an emergency type first.</p>;

  const set = (patch) => onParamsChange({ ...params, ...patch });

  return (
    <div className="scenario-config-form">
      {emergencyType === 'fire'      && <FireConfig      params={params} set={set} />}
      {emergencyType === 'explosion' && <ExplosionConfig params={params} set={set} />}
      {emergencyType === 'riot'      && <RiotConfig      params={params} set={set} />}
      {emergencyType === 'hostage'   && <HostageConfig   params={params} set={set} />}
      {emergencyType === 'flood'     && <FloodConfig     params={params} set={set} />}
      {emergencyType === 'gasLeak'   && <GasLeakConfig   params={params} set={set} />}
      <p className="hint" style={{ marginTop: 10 }}>
        Indicative simulation — not a certified engineering calculation.
      </p>
    </div>
  );
}
