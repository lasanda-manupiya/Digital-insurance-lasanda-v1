// Top navigation bar — mode selector + global file actions.

const MODES = [
  { id: 'model',     label: 'Model',      hint: 'Model info and scale calibration' },
  { id: 'sensors',   label: 'Sensors',    hint: 'Place, edit and review coverage' },
  { id: 'emergency', label: 'Emergency',  hint: 'Emergency simulation wizard' },
  { id: 'insurance', label: 'Insurance checklist', hint: 'Insurance readiness checklist and risk reduction' },
  { id: 'results',   label: 'Results',    hint: 'Simulation results and recommendations' },
];

export default function TopBar({
  appMode,
  onModeChange,
  onLoadModel,
  onSaveProject,
  onOpenProject,
  modelFileName,
  simulationStatus,
  modelLoading,
}) {
  return (
    <header className="top-bar">
      {/* Brand */}
      <div className="topbar-brand">
        <span className="topbar-title">TwinRisk AI</span>
        <span className="title-badge">Demo</span>
        {modelFileName && (
          <span className="topbar-file muted">{modelFileName}</span>
        )}
      </div>

      {/* Mode tabs */}
      <nav className="topbar-modes">
        {MODES.map((m) => {
          const hasResult = m.id === 'results' && simulationStatus === 'complete';
          return (
            <button
              key={m.id}
              className={`topbar-mode-btn ${appMode === m.id ? 'active' : ''} ${hasResult ? 'has-result' : ''}`}
              onClick={() => onModeChange(m.id)}
              title={m.hint}
            >
              {m.label}
              {hasResult && <span className="topbar-dot" />}
            </button>
          );
        })}
      </nav>

      {/* File actions */}
      <div className="topbar-actions">
        {modelLoading && <span className="mode-chip active" style={{ fontSize: 11 }}>Parsing IFC…</span>}
        <button className="btn btn-small" onClick={onLoadModel}>
          Load model
        </button>
        <button className="btn btn-small" onClick={onSaveProject}>
          Save
        </button>
        <button className="btn btn-small" onClick={onOpenProject}>
          Open
        </button>
      </div>
    </header>
  );
}
