---
name: gsap-cinematic-scroll
description: >-
  Runbook for GSAP 3, ScrollTrigger, and Lenis smooth scrolling integration.
  Use when building cinematic scroll-controlled video scrubbers, pinned editorial sections,
  horizontal storytelling layouts, smooth Lenis sync, and responsive touch transitions.
---

# GSAP ScrollTrigger & Lenis Cinematic Engineering

## 1. Synchronizing Lenis and GSAP ScrollTrigger
Never let Lenis and ScrollTrigger run separate RAF loops. Synchronize them strictly:

```typescript
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function initLenisScroll() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  // Sync ScrollTrigger updates with Lenis
  lenis.on('scroll', ScrollTrigger.update);

  // Drive Lenis via GSAP's central RAF loop
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  // Prevent jumpiness on heavy calculations or tab focus
  gsap.ticker.lagSmoothing(0);

  return lenis;
}
```

## 2. Scoped Cleanup Pattern
Always use `gsap.context()` in React components to avoid stale pin spacers and memory leaks:

```typescript
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.to('.hero-title', {
      scrollTrigger: {
        trigger: '.hero-container',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
        pin: true,
      },
      scale: 0.85,
      opacity: 0,
    });
  }, scopeRef);

  return () => ctx.revert();
}, []);
```

## 3. Scrubbed Video & Image Sequence Playback
For high-end fashion frame scrubbing:
- Video must be encoded with a GOP size of 1–2 frames (`ffmpeg -i input.mp4 -g 2 -c:v libx264 -crf 20 scrub.mp4`).
- Sync video currentTime or canvas sprite frame index to ScrollTrigger scrub:
```typescript
ScrollTrigger.create({
  trigger: videoContainer,
  start: "top top",
  end: "+=3000",
  pin: true,
  scrub: true,
  onUpdate: (self) => {
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = self.progress * videoRef.current.duration;
    }
  }
});
```

## 4. Horizontal Storytelling Sections
Translate track using GSAP xPercent with pinned parent:
```typescript
const totalPanels = panels.length;
gsap.to(panelsContainer, {
  xPercent: -100 * (totalPanels - 1),
  ease: "none",
  scrollTrigger: {
    trigger: horizontalSection,
    pin: true,
    scrub: 1,
    end: () => `+=${panelsContainer.offsetWidth}`,
  }
});
```

