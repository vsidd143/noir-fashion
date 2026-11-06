"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

// Fluid Luxury Liquid Silk / Organic Textile Sculpture inspired by Lusion.co
function LiquidObsidianFabric({
  mouse,
  isMobile,
}: {
  mouse: React.MutableRefObject<{ x: number; y: number }>;
  isMobile: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Group>(null);

  // High-end Luxury PBR Materials
  const liquidObsidianMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#0c0b0a"),
        emissive: new THREE.Color("#16120c"),
        metalness: 0.94,
        roughness: 0.16,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        reflectivity: 0.95,
      }),
    []
  );

  const goldChokerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#c5a46d"),
        metalness: 0.98,
        roughness: 0.12,
      }),
    []
  );

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    if (coreRef.current) {
      // Smooth mouse parallax with damping
      const targetRotY = mouse.current.x * 0.45 + time * 0.15;
      const targetRotX = -mouse.current.y * 0.25 + Math.sin(time * 0.6) * 0.08;

      coreRef.current.rotation.y = THREE.MathUtils.damp(
        coreRef.current.rotation.y,
        targetRotY,
        2.5,
        delta
      );
      coreRef.current.rotation.x = THREE.MathUtils.damp(
        coreRef.current.rotation.x,
        targetRotX,
        2.5,
        delta
      );
    }

    // Dynamic wave oscillation on the luxury textile form
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(time * 0.5) * 0.15;
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 0.35;
      ring1Ref.current.rotation.y += delta * 0.2;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.x -= delta * 0.25;
      ring2Ref.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <group ref={coreRef} position={[0, -0.1, 0]}>
      {/* Central Sculptural Textile Monolith (adaptive geometry segments for mobile GPU efficiency) */}
      <mesh ref={meshRef} material={liquidObsidianMat} scale={1.25}>
        <torusKnotGeometry
          args={isMobile ? [1.05, 0.32, 96, 24, 2, 3] : [1.05, 0.32, 144, 32, 2, 3]}
        />
      </mesh>

      {/* Floating Precision Gold Orbital Halos */}
      <mesh ref={ring1Ref} material={goldChokerMat} scale={1.8}>
        <torusGeometry args={isMobile ? [1.1, 0.012, 12, 72] : [1.1, 0.012, 16, 110]} />
      </mesh>

      <mesh ref={ring2Ref} material={goldChokerMat} scale={1.5} rotation={[Math.PI / 2.5, 0, 0]}>
        <torusGeometry args={isMobile ? [1.25, 0.008, 12, 72] : [1.25, 0.008, 16, 110]} />
      </mesh>

      {/* Inner Glowing Core Capsule */}
      <mesh material={goldChokerMat} scale={0.25} position={[0, 0, 0]}>
        <octahedronGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSmall = window.innerWidth < 768;
      queueMicrotask(() => setIsMobile(isSmall));
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener("resize", handleResize, { passive: true });
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Pause rendering when Hero is scrolled out of viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Pause rendering when browser tab is inactive
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      mouse.current = {
        x: (clientX / innerWidth) * 2 - 1,
        y: (clientY / innerHeight) * 2 - 1,
      };
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  const shouldRender = isVisible && isTabActive;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 h-full w-full overflow-hidden select-none pointer-events-none"
    >
      <Canvas
        camera={{ position: [0, 0, 4.6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={isMobile ? [1, 1.25] : [1, 1.75]}
        frameloop={shouldRender ? "always" : "never"}
      >
        {/* Soft Ambient Fill */}
        <ambientLight intensity={0.4} />

        {/* Studio Golden Key Rim Light */}
        <directionalLight position={[5, 6, 4]} intensity={3.8} color="#c5a46d" />

        {/* Cold High-Fashion Opposite Rim Light */}
        <directionalLight position={[-5, 4, -3]} intensity={2.8} color="#90b8f0" />

        {/* Dramatic Under-Glow */}
        <pointLight position={[0, -4, 2]} intensity={1.8} color="#ffffff" />
        <pointLight position={[0, 0, 0]} intensity={0.8} color="#c5a46d" />

        {/* Cinematic Atmospheric Dust / Floating Golden Embers (adaptive count) */}
        <Sparkles
          count={isMobile ? 35 : 75}
          scale={8}
          size={isMobile ? 2.0 : 2.6}
          speed={0.3}
          opacity={0.4}
          color="#c5a46d"
        />

        {/* Float Rig with smooth organic physics */}
        <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.45}>
          <LiquidObsidianFabric mouse={mouse} isMobile={isMobile} />
        </Float>
      </Canvas>
    </div>
  );
}
