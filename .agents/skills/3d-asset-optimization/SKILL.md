---
name: 3d-asset-optimization
description: >-
  Workflows and CLI runbooks for 3D model compression, Draco geometry encoding,
  KTX2 / Basis Universal GPU textures, video compression, and WebP/AVIF generation.
  Use when prepping 3D clothing assets, optimizing GLB payloads, and improving Core Web Vitals.
---

# 3D Asset & Media Optimization Workflow

## 1. 3D Model GLB Optimization Pipeline
Use `@gltf-transform/cli` to optimize fashion garment models:

```bash
# 1. Deduplicate meshes and prune unused nodes
npx @gltf-transform/cli dedup garment-raw.glb garment-dedup.glb
npx @gltf-transform/cli prune garment-dedup.glb garment-pruned.glb

# 2. Compress geometry using Google Draco
npx @gltf-transform/cli draco garment-pruned.glb garment-draco.glb

# 3. Compress textures to KTX2 / Basis Universal (GPU-native)
npx @gltf-transform/cli etc1s garment-draco.glb garment-optimized.glb
# Or for high-fidelity normal maps and sheen:
npx @gltf-transform/cli uastc garment-draco.glb --zstd 18 garment-final.glb
```

## 2. Target File Sizes for Web Fashion
- **Hero 3D Product**: < 2.5 MB total payload.
- **Background Decorative 3D Elements**: < 800 KB total payload.
- **Draw Calls**: Keep draw calls under 25 per scene; merge static materials.
- **Polygon Count**: Keep models under 80,000 triangles for high-end garments, < 35,000 for mobile.

## 3. Scrubbed Video Compression (Short GOP)
When scrubbing video with ScrollTrigger, long GOP sizes (standard 250 frames) cause seeking stutter. Re-encode with `keyint=2`:
```bash
ffmpeg -i runway-input.mp4 \
  -c:v libx264 -preset slow -crf 20 \
  -g 2 -keyint_min 2 -sc_threshold 0 \
  -an -movflags +faststart \
  public/videos/runway-scrub.mp4
```

## 4. WebP / AVIF Responsive Image Optimization
Use `sharp` for batch converting editorial imagery:
```javascript
import sharp from 'sharp';

await sharp('raw-editorial.jpg')
  .resize(1920, 1080, { fit: 'inside' })
  .webp({ quality: 82, effort: 6 })
  .toFile('public/images/editorial.webp');

await sharp('raw-editorial.jpg')
  .resize(1920, 1080, { fit: 'inside' })
  .avif({ quality: 75, effort: 7 })
  .toFile('public/images/editorial.avif');
```

