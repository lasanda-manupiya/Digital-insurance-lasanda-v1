import { Html } from '@react-three/drei';
import { getSensorTypeMeta } from '../data/sensorTypes.js';

export default function SensorMarker({ sensor, selected, size = 0.3, onSelect }) {
  const meta = getSensorTypeMeta(sensor.type);
  return (
    <group position={[sensor.position.x, sensor.position.y, sensor.position.z]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(sensor.id);
        }}
      >
        <sphereGeometry args={[selected ? size * 1.4 : size, 16, 16]} />
        <meshStandardMaterial
          color={meta.color}
          emissive={meta.color}
          emissiveIntensity={selected ? 0.9 : 0.35}
        />
      </mesh>
      {selected && (
        <Html position={[0, size * 2.5, 0]} center className="marker-label-wrap">
          <div className="marker-label">
            {sensor.name} · {sensor.coverageRadiusMetres} m
          </div>
        </Html>
      )}
    </group>
  );
}
