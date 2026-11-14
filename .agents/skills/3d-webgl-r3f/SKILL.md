---
name: 3d-webgl-r3f
description: >-
  Expert engineering runbook for React Three Fiber (R3F), Three.js, Drei, and Postprocessing in Next.js.
  Use when designing, building, debugging, or optimizing 3D canvases, interactive 3D clothing models,
  PBR fabric materials, custom GLSL shaders, camera controllers, and WebGL resource lifecycle management.
---

# React Three Fiber & Three.js 3D Fashion Engineering

## 1. Client-Side Only Mounting in Next.js
Never mount `<Canvas>` in a Server Component. Always use dynamic import with SSR disabled:
```tsx
import dynamic from 'next/dynamic';

const Fashion3DCanvas = dynamic(() => import('@/components/canvas/Fashion3DCanvas'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-950 animate-pulse" />
});
```

## 2. Canvas Configuration Checklist
Always configure performance boundaries on `<Canvas>`:
```tsx
<Canvas
  camera={{ position: [0, 0, 4], fov: 45 }}
  dpr={[1, 1.5]} // Never exceed 1.5 to protect mobile GPUs
  gl={{
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  }}
  frameloop={isActive ? "always" : "demand"}
>
```

## 3. Realistic Luxury Fabric Materials (`MeshPhysicalMaterial`)
Use physical material parameters to replicate luxury textiles:
- **Silk / Satin**: High sheen (`sheen: 1.0`, `sheenColor: "#ffffff"`, `sheenRoughness: 0.15`), low roughness (`0.25`), subtle clearcoat (`0.3`).
- **Technical Waterproof Outerwear**: High clearcoat (`0.8`), `clearcoatRoughness: 0.1`, medium roughness (`0.4`), metallic reflection (`0.15`).
- **Heavy Cotton / Wool**: Matte roughness (`0.85`), subtle sheen (`0.4`), zero clearcoat.
- **Translucent Technical Organza**: Transmission (`0.75`), `roughness: 0.1`, `thickness: 0.5`, `ior: 1.45`.

## 4. Smooth Mouse & Gyro Rotation
Use `maath.damping` inside `useFrame` for organic easing:
```tsx
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';

function ResponsiveModel({ pointer, modelRef }) {
  useFrame((state, delta) => {
    if (!modelRef.current) return;
    const targetY = (state.pointer.x * Math.PI) / 4;
    const targetX = (-state.pointer.y * Math.PI) / 8;
    easing.dampE(modelRef.current.rotation, [targetX, targetY, 0], 0.25, delta);
  });
}
```

## 5. Strict Memory Disposal
Prevent WebGL memory leaks by disposing of all geometries, materials, and textures on component unmount:
```tsx
useEffect(() => {
  return () => {
    if (sceneRef.current) {
      sceneRef.current.traverse((child) => {
        if ('isMesh' in child && child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
  };
}, []);
```

