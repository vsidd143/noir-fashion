import * as THREE from "three";

/**
 * Traverses a Three.js scene, group, or object and thoroughly disposes
 * of geometries, materials, textures, and custom buffers to prevent WebGL memory leaks.
 */
export function disposeThreeObject(obj: THREE.Object3D | null | undefined): void {
  if (!obj) return;

  obj.traverse((child) => {
    if ("geometry" in child && child.geometry instanceof THREE.BufferGeometry) {
      child.geometry.dispose();
    }

    if ("material" in child && child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => disposeMaterial(mat));
      } else if (child.material instanceof THREE.Material) {
        disposeMaterial(child.material);
      }
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  // Dispose all possible texture slots on PBR materials
  const record = material as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value && typeof value === "object" && "isTexture" in value && value.isTexture) {
      (value as THREE.Texture).dispose();
    }
  }
  material.dispose();
}

