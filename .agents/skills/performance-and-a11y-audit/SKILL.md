---
name: performance-and-a11y-audit
description: >-
  Procedures for auditing 3D website performance, Core Web Vitals (LCP, INP, CLS),
  Playwright end-to-end testing, and Axe-core accessibility compliance.
  Use when running tests, auditing mobile performance, or verifying that animations adhere to WCAG standards.
---

# Performance, Accessibility & Playwright Testing Runbook

## 1. Running Playwright & Axe-Core Accessibility Tests
Run automated accessibility audits to ensure 3D and animated canvases meet WCAG AA standards:

```bash
# Run all Playwright tests headlessly
npx playwright test

# Run accessibility test specifically
npx playwright test tests/a11y-and-performance.spec.ts
```

## 2. Key WCAG Requirements for 3D & Creative Websites
- **prefers-reduced-motion**:
  Always ensure that when `prefers-reduced-motion: reduce` is simulated, all continuous animations cease and page transitions are instantaneous or simple opacity crossfades.
- **Accessible Names for 3D Canvases**:
  Every `<canvas>` element must have `role="img"` and `aria-label="Interactive 3D model of [garment name]"` or be hidden from assistive technology with `aria-hidden="true"` when purely decorative.
- **Keyboard Fallback**:
  All interactive actions (rotating, zooming, inspecting materials, opening cart) must have full keyboard navigation alternatives.

## 3. Core Web Vitals Optimization Checklist
- **LCP (Largest Contentful Paint)**:
  - Do not use 3D canvas as the sole LCP element. Render an optimized static picture/hero image with `priority` attribute in Next.js.
  - Dynamically import the heavy 3D canvas so it doesn't block critical CSS or hero paint.
- **CLS (Cumulative Layout Shift)**:
  - Always give 3D canvas containers explicit aspect ratios or absolute dimensions (`aspect-[4/5]`, `h-[70vh]`).
- **INP (Interaction to Next Paint)**:
  - Keep 3D physics or math off the main thread or batched in `useFrame` with minimal CPU overhead.
  - Never run heavy geometry computations inside click or hover handlers.

