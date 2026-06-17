import { convertModelUnitsToMetres } from '../utils/scaleUtils.js';

function Row({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export default function ModelInfoPanel({ modelInfo, scaleSettings }) {
  if (!modelInfo) {
    return (
      <section className="card">
        <h2 className="card-title">Model information</h2>
        <p className="muted">Waiting for a 3D model to load…</p>
      </section>
    );
  }
  const { dimensions } = modelInfo;
  const { scaleFactor, confirmed, method, unitAssumption } = scaleSettings;
  const real = (v) => `${convertModelUnitsToMetres(v, scaleFactor).toFixed(2)} m`;

  return (
    <section className="card">
      <h2 className="card-title">Model information</h2>
      <Row label="File" value={modelInfo.fileName} />
      <Row label="Width (model units)" value={dimensions.width.toFixed(2)} />
      <Row label="Height (model units)" value={dimensions.height.toFixed(2)} />
      <Row label="Depth (model units)" value={dimensions.depth.toFixed(2)} />
      <Row label="Unit assumption" value={unitAssumption} />
      <Row label="Scale factor" value={`${scaleFactor} m / unit`} />
      <Row label="Real width" value={real(dimensions.width)} />
      <Row label="Real height" value={real(dimensions.height)} />
      <Row label="Real depth" value={real(dimensions.depth)} />
      <div className="info-row">
        <span className="info-label">Scale status</span>
        {confirmed ? (
          <span className="badge badge-low">Confirmed ({method})</span>
        ) : (
          <span className="badge badge-medium">Not confirmed</span>
        )}
      </div>
    </section>
  );
}
