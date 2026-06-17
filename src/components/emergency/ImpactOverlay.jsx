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
export default function ImpactOverlay({ frame, incidentPoint }) {
  if (!frame || !incidentPoint || !frame.impactZones?.length) return null;

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
