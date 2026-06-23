// 3D impact overlay — renders inside the R3F Canvas.
// Shows concentric semi-transparent spheres for each risk zone in the current frame.

import * as THREE from 'three';
import { getImpactColor, getImpactOpacity } from '../../utils/impactColourUtils.js';

// Incident marker — visually distinct from sensor markers (diamond / octahedron shape)
export function IncidentMarker({ point, size = 0.4 }) {
  if (!point) return null;
  return (
    <group position={[point.x, point.y, point.z]}>
      {/* Core diamond */}
      <mesh>
        <octahedronGeometry args={[size, 0]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Vertical spike to the ground for visibility */}
      <mesh position={[0, -size * 1.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, size * 3, 6]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}

// Render the concentric impact zone spheres for the current simulation frame
function HostageDetectionMarker({ frame, size = 0.45 }) {
  const detected = (frame?.sensorActivations ?? []).some((activation) => activation.status === 'Activated');
  const beaconColor = detected ? '#22c55e' : '#fbbf24';

  return (
    <group>
      {/* Simple person marker: head, torso and legs, avoiding a large circular radius over the hostage. */}
      <mesh position={[0, size * 1.75, 0]}>
        <sphereGeometry args={[size * 0.32, 16, 16]} />
        <meshStandardMaterial color="#fde68a" emissive="#92400e" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, size * 1.05, 0]}>
        <capsuleGeometry args={[size * 0.22, size * 0.75, 8, 16]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[-size * 0.13, size * 0.32, 0]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[size * 0.08, size * 0.55, 6, 10]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
      <mesh position={[size * 0.13, size * 0.32, 0]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[size * 0.08, size * 0.55, 6, 10]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>

      {/* Small beacon beside the person shows detection without drawing a hostage radius. */}
      <mesh position={[size * 0.75, size * 1.55, 0]}>
        <sphereGeometry args={[size * 0.18, 12, 12]} />
        <meshStandardMaterial color={beaconColor} emissive={beaconColor} emissiveIntensity={detected ? 1.2 : 0.45} />
      </mesh>
      <mesh position={[size * 0.75, size * 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size * 0.34, size * 0.025, 8, 24]} />
        <meshBasicMaterial color={beaconColor} transparent opacity={detected ? 0.85 : 0.45} />
      </mesh>
    </group>
  );
}

export default function ImpactOverlay({ frame, incidentPoint, scenarioType }) {
  if (!frame || !incidentPoint) return null;

  if (scenarioType === 'hostage') {
    return (
      <group position={[incidentPoint.x, incidentPoint.y, incidentPoint.z]}>
        <HostageDetectionMarker frame={frame} />
      </group>
    );
  }

  if (!frame.impactZones?.length) return null;

  // Sort zones largest-first so smaller (more severe) zones render on top
  const zones = [...frame.impactZones].sort((a, b) => b.radius - a.radius);

  return (
    <group position={[incidentPoint.x, incidentPoint.y, incidentPoint.z]}>
      {zones.map((zone, i) => (
        <mesh key={i} raycast={() => null}>
          <sphereGeometry args={[Math.max(zone.radius, 0.05), 28, 28]} />
          <meshStandardMaterial
            color={getImpactColor(zone.level)}
            transparent
            opacity={getImpactOpacity(zone.level)}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
