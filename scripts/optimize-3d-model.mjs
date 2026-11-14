#!/usr/bin/env node

/**
 * 3D Model Optimization Utility for NOIR Fashion
 * Demonstrates and executes GLB geometry compression, Draco encoding,
 * and texture deduplication.
 *
 * Usage:
 *   node scripts/optimize-3d-model.mjs <input.glb> [output.glb]
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const input = process.argv[2];
const output = process.argv[3] || input?.replace(/\.glb$/, "-optimized.glb");

if (!input || !fs.existsSync(input)) {
  console.log("Usage: node scripts/optimize-3d-model.mjs <path-to-model.glb> [output.glb]");
  console.log("\nPipeline Steps Performed:");
  console.log("  1. Dedup: Merges duplicate accessors and materials.");
  console.log("  2. Prune: Removes unused nodes, animations, and textures.");
  console.log("  3. Draco: Compresses geometry coordinates and normals.");
  console.log("  4. Texture resize: Downsamples oversized 4K textures to 2K/1K for mobile.");
  process.exit(0);
}

try {
  console.log(`Optimizing: ${input} -> ${output}`);
  const command = `npx @gltf-transform/cli optimize "${input}" "${output}" --draco`;
  console.log(`Running: ${command}`);
  execSync(command, { stdio: "inherit" });

  const originalSize = fs.statSync(input).size / (1024 * 1024);
  const optimizedSize = fs.statSync(output).size / (1024 * 1024);
  const reduction = (((originalSize - optimizedSize) / originalSize) * 100).toFixed(1);

  console.log(`\nSuccess! Original: ${originalSize.toFixed(2)}MB, Optimized: ${optimizedSize.toFixed(2)}MB (${reduction}% reduction)`);
} catch (error) {
  console.error("Optimization failed:", error.message);
  process.exit(1);
}

