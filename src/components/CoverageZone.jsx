import * as THREE from 'three';
import { convertMetresToModelUnits } from '../utils/scaleUtils.js';
import { getSensorTypeMeta } from '../data/sensorTypes.js';

// Transparent coverage volume around a sensor. Radius is defined in metres and
// converted to model units with the confirmed scale factor, so the visual size
// always reflects real-world distance.
export default function CoverageZone({ sensor, scaleFactor }) {
  const meta = getSensorTypeMeta(sensor.type);
  const radius = convertMetresToModelUnits(Number(sensor.coverageRadiusMetres) || 0, scaleFactor);
  if (radius <= 0) return null;
  const pos = [sensor.position.x, sensor.position.y, sensor.position.z];
  return (
    <group position={pos}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={meta.color}
          transparent
          opacity={0.14}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {meta.floorBased && (
        <group rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
          <mesh raycast={() => null}>
            <circleGeometry args={[radius, 48]} />
            <meshBasicMaterial color={meta.color} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh raycast={() => null}>
            <ringGeometry args={[radius * 0.97, radius, 48]} />
            <meshBasicMaterial color={meta.color} transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}
