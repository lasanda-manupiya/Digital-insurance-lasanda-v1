import { useState } from 'react';
import {
  calculateDistanceBetweenPoints,
  calculateScaleFactorFromKnownDistance,
} from '../utils/scaleUtils.js';

export default function ScaleCalibrationPanel({
  scaleSettings,
  interactionMode,
  calibrationPoints,
  modelLoaded,
  onAcceptDetected,
  onApplyManualScale,
  onStartCalibration,
  onCancelCalibration,
  onApplyCalibration,
}) {
  const [manualFactor, setManualFactor] = useState(String(scaleSettings.scaleFactor));
  const [realDistance, setRealDistance] = useState('10');

  const calibrating = interactionMode === 'calibrate';
  const modelDistance =
    calibrationPoints.length === 2
      ? calculateDistanceBetweenPoints(calibrationPoints[0], calibrationPoints[1], 1)
      : null;

  const applyManual = () => {
    const factor = parseFloat(manualFactor);
    if (factor > 0) onApplyManualScale(factor);
  };

  const applyCalibration = () => {
    const real = parseFloat(realDistance);
    if (!modelDistance || !(real > 0)) return;
    onApplyCalibration(calculateScaleFactorFromKnownDistance(modelDistance, real));
  };

  return (
    <section className="card">
      <h2 className="card-title">Scale confirmation</h2>
      <p className="muted">
        Uploaded models may be in metres, millimetres, feet or unitless. Confirm the scale before
        trusting dimensions and coverage radii.
      </p>

      <div className="field-row">
        <button className="btn" onClick={onAcceptDetected} disabled={!modelLoaded}>
          Accept detected scale (1 unit = 1 m)
        </button>
      </div>

      <div className="field">
        <label>Manual scale factor (metres per model unit)</label>
        <div className="field-row">
          <input
            type="number"
            step="0.001"
            min="0"
            value={manualFactor}
            onChange={(e) => setManualFactor(e.target.value)}
          />
          <button className="btn" onClick={applyManual} disabled={!modelLoaded}>
            Apply
          </button>
        </div>
      </div>

      <div className="field">
        <label>Two-point calibration</label>
        {!calibrating ? (
          <button className="btn" onClick={onStartCalibration} disabled={!modelLoaded}>
            Pick two points on the model
          </button>
        ) : (
          <>
            <p className="hint">
              Click two points on the model with a known real-world distance between them.{' '}
              Points picked: {calibrationPoints.length} / 2
            </p>
            {modelDistance != null && (
              <p className="hint">Model distance: {modelDistance.toFixed(3)} model units</p>
            )}
            <div className="field-row">
              <input
                type="number"
                step="0.1"
                min="0"
                value={realDistance}
                onChange={(e) => setRealDistance(e.target.value)}
                placeholder="Real distance (m)"
              />
              <button className="btn btn-primary" onClick={applyCalibration} disabled={!modelDistance}>
                Apply
              </button>
              <button className="btn" onClick={onCancelCalibration}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
