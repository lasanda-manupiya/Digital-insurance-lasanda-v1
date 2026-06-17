// Timeline playback bar shown below the 3D viewer during / after simulation.

import { useEffect, useRef, useState } from 'react';
import { IMPACT_LEVELS } from '../../utils/impactColourUtils.js';

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function SimulationTimeline({
  frames,
  currentFrameIndex,
  onFrameChange,
  scenarioLabel,
  scenarioType,
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);

  const totalFrames = frames?.length ?? 0;
  const currentFrame = frames?.[currentFrameIndex] ?? null;

  // Auto-advance during playback
  useEffect(() => {
    if (!playing) { clearInterval(intervalRef.current); return; }
    const delayMs = (800 / speed);
    intervalRef.current = setInterval(() => {
      onFrameChange((prev) => {
        if (prev >= totalFrames - 1) { setPlaying(false); return prev; }
        return prev + 1;
      });
    }, delayMs);
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, totalFrames, onFrameChange]);

  if (!totalFrames) return null;

  const activatedCount = (currentFrame?.sensorActivations ?? []).filter((a) => a.status === 'Activated').length;
  const affectedPeople = currentFrame?.occupancyImpact?.totalAffected ?? 0;
  const riskZones = currentFrame?.impactZones ?? [];
  const topRisk = riskZones[0]?.level ?? 'unknown'; // first zone is most severe

  return (
    <div className="sim-timeline">
      <div className="sim-timeline-header">
        <span className="sim-type-label">{scenarioLabel ?? scenarioType}</span>
        <span className="muted" style={{ fontSize: 11 }}>Indicative simulation</span>
      </div>

      {/* Status chips */}
      <div className="sim-status-chips">
        <span className="sim-chip" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
          T = {formatTime(currentFrame?.timeSeconds ?? 0)}
        </span>
        <span className="sim-chip" style={{ background: `${IMPACT_LEVELS[topRisk]?.color}22`, color: IMPACT_LEVELS[topRisk]?.color }}>
          {IMPACT_LEVELS[topRisk]?.label ?? 'Safe'}
        </span>
        <span className="sim-chip">
          {affectedPeople} people affected
        </span>
        <span className="sim-chip">
          {activatedCount} sensor{activatedCount !== 1 ? 's' : ''} activated
        </span>
        {currentFrame?.alarmActive && (
          <span className="sim-chip" style={{ background: 'rgba(248,113,113,0.14)', color: '#ef4444' }}>
            Alarm active
          </span>
        )}
      </div>

      {/* Scrubber */}
      <div className="sim-controls">
        <button className="btn btn-small" title="Reset" onClick={() => { setPlaying(false); onFrameChange(0); }}>
          &#9632; Reset
        </button>
        <button className="btn btn-small" onClick={() => onFrameChange((p) => Math.max(0, p - 1))}>
          &#9664;
        </button>
        <button
          className={playing ? 'btn btn-small btn-active' : 'btn btn-small btn-primary'}
          onClick={() => {
            if (currentFrameIndex >= totalFrames - 1) onFrameChange(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? '&#9646;&#9646; Pause' : '&#9654; Play'}
        </button>
        <button className="btn btn-small" onClick={() => onFrameChange((p) => Math.min(totalFrames - 1, p + 1))}>
          &#9654;
        </button>

        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrameIndex}
          onChange={(e) => { setPlaying(false); onFrameChange(Number(e.target.value)); }}
          className="sim-scrubber"
        />

        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          style={{ width: 70 }}
        >
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>
      </div>

      {/* Time tick labels */}
      <div className="sim-tick-row">
        {frames.map((f, i) => (
          <button
            key={i}
            className={`sim-tick ${i === currentFrameIndex ? 'active' : ''}`}
            onClick={() => { setPlaying(false); onFrameChange(i); }}
          >
            {formatTime(f.timeSeconds)}
          </button>
        ))}
      </div>

      {/* Notes from current frame */}
      {currentFrame?.notes?.length > 0 && (
        <div className="sim-notes">
          {currentFrame.notes.map((n, i) => (
            <span key={i} className="sim-note">{n}</span>
          ))}
        </div>
      )}

      {/* Colour legend */}
      <div className="sim-legend">
        {Object.entries(IMPACT_LEVELS).filter(([k]) => k !== 'unknown').map(([key, meta]) => (
          <span key={key} className="legend-item">
            <span className="legend-dot" style={{ background: meta.color }} />
            <span className="legend-label">{meta.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
