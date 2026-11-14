# 3D, WebGL & Cinematic Animation Development Rules

These rules govern all 3D WebGL, GSAP animation, Next.js architecture, and creative frontend development within this repository. All contributors and AI agents must strictly adhere to these guidelines.

---

## 1. Mobile-First Responsive Development & Layout Integrity
- **No Horizontal Overflow**: Always enforce `overflow-x: hidden` on root containers and ensure no animated element extends beyond `100vw` without clipping.
- **Touch-Friendly Interactions**: Touch targets must be at least `44x44px`. Touch events must not conflict with smooth scroll (`touch-action: pan-y` on interactive canvases where scroll should pass through, or explicit drag handlers).
- **Mobile Viewport Adaptation**: Account for mobile dynamic toolbars (`100dvh` / `100svh` instead of static `100vh`).
- **Responsive 3D Scaling**: Adapt camera FOV, distance, and mesh scaling across breakpoints (e.g. `isMobile ? 65 : 45` FOV).

---

## 2. GSAP & Animation Performance & Cleanup
- **Scoped GSAP Context**: Every GSAP timeline or ScrollTrigger created inside a React component MUST be wrapped in `gsap.context()` inside a `useEffect` or `useLayoutEffect`, returning `ctx.revert()` in the cleanup callback:
  ```typescript
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Create animations and ScrollTriggers here
    }, containerRef);
    return () => ctx.revert(); // Essential: prevents memory leaks and stale pin spacer artifacts
  }, []);
  ```
- **Lenis & ScrollTrigger Synchronization**:
  - Lenis smooth scroll must drive ScrollTrigger updates via `lenis.on('scroll', ScrollTrigger.update)`.
  - GSAP's ticker must drive Lenis requestAnimationFrame via `gsap.ticker.add((time) => lenis.raf(time * 1000))`.
  - Set `gsap.ticker.lagSmoothing(0)` to prevent jumpiness on tab switch.
- **Hardware Acceleration**: Animate `transform` (`x`, `y`, `scale`, `rotation`) and `opacity` only. Never animate layout-triggering properties (`top`, `left`, `width`, `height`, `margin`, `padding`).
- **Reduced Motion Support**: Always check `window.matchMedia("(prefers-reduced-motion: reduce)").matches`. When active, disable continuous floating loops, instant-snap scrubbers, and replace kinetic transitions with subtle opacity fades.

---

## 3. WebGL & Three.js / React Three Fiber Rules
- **Resource Disposal**: Every geometry, material, texture, render target, and custom buffer must be systematically disposed when unmounted or swapped:
  - Call `.dispose()` on `geometry`, `material`, `texture`, and postprocessing passes.
  - Traverse meshes on unmount:
    ```typescript
    mesh.geometry?.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material?.dispose();
    }
    ```
- **DPR Capping**: Cap device pixel ratio to `[1, 1.5]` (or maximum `[1, 2]` on desktop, `[1, 1.25]` on mobile). Rendering at native `3x` Retina resolution burns GPU fill rate unnecessarily.
- **Adaptive Frameloop**: Use `frameloop="demand"` for mostly static showcases, or gate `frameloop={isVisible && isTabActive ? "always" : "never"}` using `IntersectionObserver` and document `visibilitychange`.
- **Frustum Culling & Instancing**:
  - Keep `frustumCulled = true` on all meshes.
  - Use `InstancedMesh` for particles, floating dust, repeated garment accessories, or repeated fabric weave threads.
- **Client-Side Only Dynamic Import**: Never render `@react-three/fiber` `<Canvas>` on the server. Always dynamically import 3D canvases with `next/dynamic` and `{ ssr: false }`. Provide a lightweight CSS skeleton/loader while the 3D bundle initializes.

---

## 4. Realistic 3D Clothing & Fabric Materials
- **PBR Workflow**: Utilize `MeshPhysicalMaterial` for luxury garments:
  - `roughness`: 0.6–0.9 for matte textiles (wool, cotton, raw denim).
  - `sheen` & `sheenRoughness`: for velvet, silk, satin, and micro-fiber sheen.
  - `clearcoat` & `clearcoatRoughness`: 0.1–0.4 for technical waterproof jackets, patent leather, or coated vinyl.
  - `transmission` & `thickness`: for organza, sheer fabrics, and translucent technical polymers.
- **Lighting Rig**: Combine soft warm key light with cool metallic rim lighting and subtle ambient fill. Use an HDR environment map (compressed via `.hdr` or `.exr` downscaled to 1k/512) for realistic PBR reflections.
- **Smooth Damping**: Smooth mouse movement and camera tracking using `maath.damping` (`damp3`, `dampE`, `dampQ`) inside `useFrame` for a cinematic fluid feel rather than rigid direct binding.

---

## 5. Asset Optimization & Compression
- **3D Models**: All production 3D models must be delivered in binary `.glb` format.
- **Draco Compression**: Apply Draco geometry compression for high-polygon garments to reduce file transfer by 70–90%.
- **KTX2 / Basis Universal Textures**: For high-resolution fabric normals and diffuse maps, encode to KTX2 GPU textures for instantaneous VRAM uploading and 75% memory savings.
- **Images & Video**:
  - Serve images as modern AVIF/WebP with responsive `next/image` sizing.
  - Scroll-controlled video clips must be encoded with short GOP (Keyframe every 1–3 frames, H.264 baseline/main) so scrubbing forwards and backwards is instantaneous and artifact-free.

---

## 6. Architecture, Types & Error Prevention
- **Strict TypeScript**: No `any` types on 3D objects, animation configs, or API responses. Use `@types/three` and proper R3F types (`ThreeElements`).
- **No Hydration Errors**: Never read window dimensions, matchMedia, or user-agent during initial server render. Initialize responsive states inside `useEffect` or provide deterministic server fallbacks.
- **No Console Errors or Warnings**: Unused variables, duplicate keys, unhandled promise rejections, and Three.js shader warnings must be resolved immediately.
- **Clean Separation of Concerns**: Keep 3D scene graphs in `src/components/canvas/`, UI overlays in `src/components/ui/`, custom hooks in `src/hooks/`, and math/shader utilities in `src/lib/3d/`.

