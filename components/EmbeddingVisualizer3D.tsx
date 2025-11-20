  "use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { motion } from "framer-motion";

export function EmbeddingVisualizer3D() {
  const nodes = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, index) => ({
        position: [
          Math.sin(index) * 1.5,
          Math.cos(index * 1.3) * 1.2,
          Math.sin(index * 1.8) * 1.6,
        ] as [number, number, number],
        color: index % 3 === 0 ? "#72F5E4" : index % 3 === 1 ? "#A855F7" : "#38BDF8",
        seed: index,
      })),
    [],
  );

  return (
    <motion.div
      id="visuals"
      className="glass-panel relative h-96 w-full overflow-hidden rounded-3xl"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.8 }}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={1.5} color="#72F5E4" />
          <group rotation={[0.3, 0.3, 0]}>
            <mesh>
              <sphereGeometry args={[1.8, 64, 64]} />
              <meshStandardMaterial
                color="#0a1124"
                transparent
                opacity={0.35}
                wireframe
              />
            </mesh>
            {nodes.map((node, index) => (
              <FloatingNode key={`node-${index}`} {...node} />
            ))}
          </group>
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1.6} />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/60 via-transparent to-transparent p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">Embedding Space</p>
        <p className="text-white/80">Neon-coded clusters highlight semantic similarity</p>
      </div>
    </motion.div>
  );
}

function FloatingNode({
  position,
  color,
  seed,
}: {
  position: [number, number, number];
  color: string;
  seed: number;
}) {
  const scale = useMemo(() => 0.08 + (Math.abs(Math.sin(seed * 1.37)) % 0.05), [seed]);
  return (
    <mesh position={position}>
      <sphereGeometry args={[scale, 16, 16]} />
      <meshStandardMaterial emissive={color} emissiveIntensity={0.9} color={color} />
    </mesh>
  );
}
