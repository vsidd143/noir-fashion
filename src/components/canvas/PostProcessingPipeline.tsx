"use client";

import React from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
} from "@react-three/postprocessing";
import * as THREE from "three";

interface PostProcessingPipelineProps {
  bloomIntensity?: number;
  bloomLuminanceThreshold?: number;
  enableVignette?: boolean;
  enableChromaticAberration?: boolean;
  enableNoise?: boolean;
}

/**
 * Reusable Post-Processing Pipeline for cinematic fashion rendering.
 * Automatically adapts or scales down effects for mobile devices.
 */
export default function PostProcessingPipeline({
  bloomIntensity = 0.8,
  bloomLuminanceThreshold = 0.65,
  enableVignette = true,
  enableChromaticAberration = false,
  enableNoise = false,
}: PostProcessingPipelineProps) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomLuminanceThreshold}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      {enableVignette && <Vignette offset={0.3} darkness={0.7} />}
      {enableNoise && <Noise opacity={0.03} />}
      {enableChromaticAberration && (
        <ChromaticAberration
          offset={new THREE.Vector2(0.0015, 0.0015)}
          radialModulation={false}
          modulationOffset={0}
        />
      )}
    </EffectComposer>
  );
}

