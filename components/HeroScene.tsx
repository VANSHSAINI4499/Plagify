"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Text } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Line2 } from "three-stdlib";

export function HeroScene() {
  const rings = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => ({
        radius: 2 + index * 0.4,
        color: index % 2 === 0 ? "#00ffd1" : "#a855f7",
      })),
    [],
  );

  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: [0, 0, 6], fov: 60 }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 3]} intensity={1.2} color="#a855f7" />
        <pointLight position={[-3, -3, -3]} intensity={1} color="#00ffd1" />
        <group rotation={[Math.PI / 4, Math.PI / 4, 0]}>
          {rings.map((ring, index) => (
            <FloatingRing key={`ring-${ring.radius}`} radius={ring.radius} color={ring.color} speed={0.4 + index * 0.15} />
          ))}
          <FloatingLabel />
        </group>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
      </Suspense>
    </Canvas>
  );
}

function FloatingRing({ radius, color, speed }: { radius: number; color: string; speed: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push([Math.cos(angle) * radius, Math.sin(angle) * radius, 0]);
    }
    return pts;
  }, [radius]);
  const ref = useRef<Line2>(null);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.z += speed * delta;
    }
  });

  return (
    <Line
      ref={ref}
      points={points}
      color={color}
      lineWidth={1}
      dashed={false}
      transparent
      opacity={0.5}
    />
  );
}

function FloatingLabel() {
  const labelRef = useRef<THREE.Object3D>(null);
  useFrame((_state, delta) => {
    if (labelRef.current) {
      labelRef.current.rotation.z += delta * 0.3;
    }
  });
  return (
      <Text
        ref={labelRef}
        fontSize={0.6}
        color="#00ffd1"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.2]}
        outlineWidth={0.02}
        outlineColor="#a855f7"
      >
        Plagify
      </Text>
  );
}
