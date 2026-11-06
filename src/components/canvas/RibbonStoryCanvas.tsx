"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function FloatingRibbon() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.x = Math.sin(time * 0.4) * 0.3;
    meshRef.current.rotation.y += delta * 0.35;
    meshRef.current.rotation.z = Math.cos(time * 0.3) * 0.2;
  });

  return (
    <group scale={1.2}>
      {/* Outer twisted Mobius / Torus ribbon */}
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1.3, 0.22, 112, 28, 2, 3]} />
        <meshPhysicalMaterial
          color="#c5a46d"
          metalness={0.92}
          roughness={0.18}
          clearcoat={0.6}
          clearcoatRoughness={0.1}
          wireframe={false}
        />
      </mesh>
    </group>
  );
}

export default function RibbonStoryCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);

  // Pause rendering when scrolled out of view
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

  const shouldRender = isVisible && isTabActive;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen z-0"
    >
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        frameloop={shouldRender ? "always" : "never"}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 5, 3]} intensity={2.5} color="#c5a46d" />
        <directionalLight position={[-4, -3, -2]} intensity={1.8} color="#ffffff" />
        <Float speed={1.8} rotationIntensity={0.4} floatIntensity={0.6}>
          <FloatingRibbon />
        </Float>
      </Canvas>
    </div>
  );
}
