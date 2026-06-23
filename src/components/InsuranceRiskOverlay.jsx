import { Html } from '@react-three/drei';

export default function InsuranceRiskOverlay({ overlays = [] }) {
  return overlays.map((o) => <group key={o.id} position={[o.position.x, o.position.y, o.position.z]} raycast={() => null}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[o.radius || 5, 32]} />
      <meshBasicMaterial color={o.status === 'Covered' ? '#4ade80' : '#fbbf24'} transparent opacity={0.16} depthWrite={false} />
    </mesh>
    <Html distanceFactor={12}><div className="marker-label">{o.label}</div></Html>
  </group>);
}
