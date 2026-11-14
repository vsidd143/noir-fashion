<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Engineering & 3D Development Rules
Please strictly enforce the full project-level guidelines located at [.agents/rules/3d-development-rules.md](file://.agents/rules/3d-development-rules.md):
- Scoped GSAP cleanup with `gsap.context()` & `ctx.revert()`.
- Systematic Three.js disposal (`geometry.dispose()`, `material.dispose()`, `texture.dispose()`).
- DPR capping (`[1, 1.5]`), adaptive frameloop, and dynamic client-side imports (`ssr: false`).
- Mobile-first responsiveness (`overflow-x: hidden`, touch target >= 44px, `100dvh`).
- Zero console errors, zero hydration mismatches, and strict TypeScript types.

