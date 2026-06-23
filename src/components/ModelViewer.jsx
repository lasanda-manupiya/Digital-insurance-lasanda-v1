import { Component, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, Html, Line, OrbitControls, useGLTF } from '@react-three/drei';
import SensorMarker from './SensorMarker.jsx';
import CoverageZone from './CoverageZone.jsx';
import ImpactOverlay, { IncidentMarker } from './emergency/ImpactOverlay.jsx';
import InsuranceRiskOverlay from './InsuranceRiskOverlay.jsx';
import { calculateModelDimensions } from '../utils/modelUtils.js';
import { getSensorTypeMeta } from '../data/sensorTypes.js';

function ModelObject({ object, fileName, onLoaded, onClickPoint }) {
  const reportedFor = useRef(null);
  const handledClick = useRef(null);

  useEffect(() => {
    if (reportedFor.current === object) return;
    reportedFor.current = object;
    onLoaded({ fileName, ...calculateModelDimensions(object) });
  }, [object, fileName, onLoaded]);

  return (
    <primitive
      object={object}
      onClick={(e) => {
        if (e.delta > 5) return;
        if (handledClick.current === e.nativeEvent) return;
        handledClick.current = e.nativeEvent;
        e.stopPropagation();
        const hit = e.intersections[0]?.point || e.point;
        onClickPoint({ x: hit.x, y: hit.y, z: hit.z });
      }}
    />
  );
}

function CameraZoomController({ zoomLevel }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.zoom = zoomLevel;
    camera.updateProjectionMatrix();
  }, [camera, zoomLevel]);

  return null;
}

function GltfModel({ url, fileName, onLoaded, onClickPoint }) {
  const { scene } = useGLTF(url);
  return (
    <ModelObject object={scene} fileName={fileName} onLoaded={onLoaded} onClickPoint={onClickPoint} />
  );
}

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <Html center>
          <div className="model-error">
            Could not load the 3D model.<br />
            Run <code>npm run generate-model</code> or load a .glb / .ifc file.
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

// Pulsing activated sensor indicator (shown during simulation)
function ActivatedSensorGlow({ sensor, size }) {
  const meta = getSensorTypeMeta(sensor.type);
  const isAlarm = meta.family === 'Alarm';
  const pulseRef = useRef(null);
  const ringRef = useRef(null);
  const strobeRef = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * (isAlarm ? 8 : 5)) * (isAlarm ? 0.32 : 0.18);
    if (pulseRef.current) pulseRef.current.scale.setScalar(pulse);
    if (ringRef.current) {
      const ringPulse = 1 + ((t * 1.8) % 1) * 0.55;
      ringRef.current.scale.setScalar(ringPulse);
      ringRef.current.material.opacity = 0.85 - ((t * 1.8) % 1) * 0.55;
    }
    if (strobeRef.current) {
      strobeRef.current.material.opacity = Math.sin(t * 14) > 0 ? 0.95 : 0.25;
    }
  });

  return (
    <group position={[sensor.position.x, sensor.position.y, sensor.position.z]} raycast={() => null}>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[size * (isAlarm ? 3.2 : 2.2), 16, 16]} />
        <meshStandardMaterial color={isAlarm ? '#ef4444' : '#fbbf24'} transparent opacity={isAlarm ? 0.35 : 0.25} depthWrite={false} />
      </mesh>
      {isAlarm && (
        <>
          <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[size * 4.2, size * 0.12, 8, 32]} />
            <meshBasicMaterial color="#fca5a5" transparent opacity={0.8} depthWrite={false} />
          </mesh>
          <mesh ref={strobeRef} position={[0, size * 2.6, 0]}>
            <coneGeometry args={[size * 0.8, size * 1.2, 16]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.95} />
          </mesh>
          <Html center distanceFactor={14} position={[0, size * 4.1, 0]}>
            <div className="ringing-beacon-label">RINGING</div>
          </Html>
        </>
      )}
    </group>
  );
}

export default function ModelViewer({
  modelSource,
  modelInfo,
  interactionMode,
  sensors,
  selectedSensorId,
  calibrationPoints,
  scaleFactor,
  // emergency simulation props
  incidentPoint,
  currentSimFrame,
  activatedSensorIds,
  onModelLoaded,
  onModelClick,
  onSelectSensor,
  insuranceOverlays = [],
  zoomLevel = 1,
}) {
  const maxDim = modelInfo?.maxDimension || 30;
  const markerSize = Math.min(Math.max(maxDim / 80, 0.12), 1.5);
  const cursor = (interactionMode === 'orbit') ? 'grab' : 'crosshair';

  return (
    <Canvas
      style={{ cursor }}
      camera={{ position: [maxDim * 1.2, maxDim * 0.8, maxDim * 1.2], fov: 50, near: 0.1, far: maxDim * 40 }}
      onPointerMissed={() => onSelectSensor(null)}
    >
      <CameraZoomController zoomLevel={zoomLevel} />
      <color attach="background" args={['#0b1626']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[30, 50, 20]}  intensity={1.4} />
      <directionalLight position={[-20, 30, -30]} intensity={0.4} />

      <ModelErrorBoundary resetKey={modelSource.kind === 'url' ? modelSource.url : modelSource.object}>
        <Suspense
          fallback={
            <Html center>
              <div className="model-loading">Loading 3D model…</div>
            </Html>
          }
        >
          {modelSource.kind === 'url' ? (
            <GltfModel
              url={modelSource.url}
              fileName={modelSource.fileName}
              onLoaded={onModelLoaded}
              onClickPoint={onModelClick}
            />
          ) : (
            <ModelObject
              object={modelSource.object}
              fileName={modelSource.fileName}
              onLoaded={onModelLoaded}
              onClickPoint={onModelClick}
            />
          )}
        </Suspense>
      </ModelErrorBoundary>

      {/* Sensor markers and coverage zones */}
      {sensors.map((sensor) => (
        <group key={sensor.id}>
          <SensorMarker
            sensor={sensor}
            selected={sensor.id === selectedSensorId}
            size={markerSize}
            onSelect={onSelectSensor}
          />
          {sensor.coverageVisible && (
            <CoverageZone sensor={sensor} scaleFactor={scaleFactor} />
          )}
          {/* Glow on activated sensors during simulation */}
          {activatedSensorIds?.includes(sensor.id) && (
            <ActivatedSensorGlow sensor={sensor} size={markerSize} />
          )}
        </group>
      ))}

      <InsuranceRiskOverlay overlays={insuranceOverlays} />

      {/* Emergency incident marker */}
      <IncidentMarker point={incidentPoint} size={markerSize * 1.2} />

      {/* Impact zone overlay — updates as timeline scrubs */}
      <ImpactOverlay frame={currentSimFrame} incidentPoint={incidentPoint} scenarioType={currentSimFrame?.scenarioType} />

      {/* Calibration points */}
      {calibrationPoints.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[markerSize * 0.8, 12, 12]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      ))}
      {calibrationPoints.length === 2 && (
        <Line
          points={calibrationPoints.map((p) => [p.x, p.y, p.z])}
          color="#facc15"
          lineWidth={2}
          dashed
          dashSize={0.4}
          gapSize={0.2}
        />
      )}

      <Grid
        position={[0, -0.02, 0]}
        args={[maxDim * 4, maxDim * 4]}
        cellSize={Math.max(1, Math.round(maxDim / 20))}
        cellColor="#1d3050"
        sectionSize={Math.max(5, Math.round(maxDim / 4))}
        sectionColor="#2a4368"
        fadeDistance={maxDim * 4}
        infiniteGrid
      />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
    </Canvas>
  );
}
