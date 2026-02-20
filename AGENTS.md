# motion-solid (agent guide)

This file is the canonical maintenance contract for the repo.
When in doubt, follow this file and update other docs to match.

## Mission and non-negotiables

- Build a SolidJS-first Motion library that stays behaviorally aligned with Framer Motion internals where possible.
- Keep the public API Solid-native: Accessors where reactive values are exposed, Solid component patterns, and Solid-safe SSR/hydration behavior.
- Keep style/transform keys canonical in kebab-case for Solid usage (`scale-x`, `rotate-y`, `transform-perspective`, `origin-x`, etc).
- Preserve compatibility with `motion-dom` internals and data flow rather than reinventing animation logic.

## Mandatory documentation policy (strict)

- Every change in this repository MUST be documented in `AGENTS.md` in the same branch/PR.
- Documentation must always be up to date with implementation.
- If behavior, API, defaults, timing, or edge cases change, update all relevant docs in the same change:
  - `AGENTS.md`
  - `package/README.md`
  - docs site pages under `docs/src/routes/docs/*.mdx`
- If a change intentionally diverges from Framer Motion semantics, add an explicit "Divergence" note in docs and tests.
- A task is not complete until code, tests, and docs all agree.

## Repository map

- Monorepo root uses Bun workspaces: `package` (library) and `docs` (site).
- Library source: `package/src`
- Library tests: `package/tests`
- Docs site content: `docs/src/routes/docs`
- CI workflows: `.github/workflows`

## Package manager and key commands

- Package manager: `bun`
- Install dependencies: `bun install --frozen-lockfile`
- Root dev docs: `bun dev`
- Root lint: `bun run lint`
- Root lint fix: `bun run lint:fix`
- Root format: `bun run format`
- Root format check: `bun run format:check`

Library (`motion-solid`) commands:

- Build: `bun --filter motion-solid build`
- Typecheck: `bun --filter motion-solid typecheck`
- Test (vitest): `bun --filter motion-solid test`
- Test watch: `bun --filter motion-solid test:watch`
- Browser tests (playwright): `bun --filter motion-solid test:browser`

Docs (`@motion-solid/docs`) commands:

- Dev: `bun --filter @motion-solid/docs dev`
- Build: `bun --filter @motion-solid/docs build`
- Start: `bun --filter @motion-solid/docs start`
- Typecheck: `bun --filter @motion-solid/docs typecheck`

## CI expectations

- Test workflow runs: typecheck -> build -> vitest -> playwright chromium.
- Publish workflow runs: typecheck -> build -> npm publish (from `package/`).
- Local changes should be verified with the same command family before merge.

## Code style and TS policy

- 2-space indent, double quotes, trailing commas, semicolons.
- Strict TypeScript. Do not use `any` or `as any`.
- Prefer strongly typed wrappers at boundaries instead of casting through unknown.
- Use type-only imports for types.
- Keep reactive derivations in `createMemo`; use `createEffect`/`createRenderEffect` only when side effects are required.
- Avoid unnecessary allocations and reactive churn in hot paths.

## Solid-first API conventions

- API design must feel native to SolidJS, not a React API copied over.
- Prefer Accessors for reactive values in hooks/context (`usePresence`, `useIsPresent`, `usePresenceData`, config accessors).
- Keep prop splitting explicit using `splitProps` and `motionKeys`.
- Add new motion-specific props to `motionKeys` whenever MotionOptions surface grows.
- Maintain SSR safety:
  - avoid DOM reads on server
  - avoid hydration mismatch by deferring client-only writes appropriately
  - keep initial render deterministic

## Naming and style key conventions

- Canonical public style and motion keys are kebab-case.
- Do not add new camelCase alias APIs for transforms or motion CSS keys.
- Existing internal compatibility paths may still normalize camelCase input from `motion-dom`/ecosystem boundaries, but docs and types should prioritize kebab-case usage.
- CSS variables (`--*`) must pass through unchanged.

## Framer Motion parity requirements

- Align semantics with Framer Motion internals for:
  - variant resolution and inheritance
  - transition overrides (`default`, per-key, `layout`)
  - gesture layering precedence
  - AnimatePresence lifecycle and exit handoff
  - layout/layoutId projection behavior
- Before changing behavior, verify parity assumptions in source and tests.
- If parity is impossible due to Solid runtime differences, document the exact behavior and rationale.

## Architecture deep dive

### 1) Public surface and component factory

- Entry exports are centralized in `package/src/index.ts`.
- `motion` proxy in `package/src/component/index.tsx` lazily caches generated components per tag.
- `createMotionComponent(tag)` in `package/src/component/create-motion-component.tsx` wraps intrinsic elements through `Dynamic`.

### 2) Prop processing and state wiring

- Motion props are split using `splitProps(..., motionKeys)`.
- `MotionConfig` defaults are merged into per-component options.
- Presence-aware overrides are applied (`initial`, `custom`, entrance blocking behavior).
- A Motion state store (`createMotionState`) tracks:
  - DOM element ref
  - MotionValues map
  - resolved/current goals
  - active gestures
  - active variants
  - parent linkage for inheritance

### 3) Animation engine flow

- Main hook: `useAnimationState` in `package/src/animation/use-animation-state.ts`.
- Core responsibilities:
  - resolve definitions (`initial`, `animate`, `exit`, `while*`) into concrete targets
  - create missing MotionValues via `buildAnimationTypeMotionValues`
  - schedule DOM writes through `frame.render`
  - combine projection styles with animated styles safely
  - manage WAAPI/native animation handoff and completion cleanup
- Animation type priority currently follows `animationTypes` ordering in `package/src/animation/types.ts`.
- Keep this precedence stable unless parity research and tests justify a change.

### 4) Variant resolution and inheritance

- Resolution lives in `package/src/animation/variants.ts`.
- Supports:
  - target objects
  - variant labels
  - function variants
  - parent variant inheritance when `inherit !== false`
- Key normalization flows through transform normalization; avoid introducing duplicate key aliases that create ambiguity.

### 5) Presence and exit lifecycle

- Presence context and hooks live in `package/src/component/presence.tsx`.
- `AnimatePresence` supports `mode`: `sync`, `wait`, `popLayout`.
- Exit lifecycle relies on retained DOM + completion signaling (`onExitComplete`) and exit handoff for unmounting motion components.
- Presence APIs expose Accessors and Solid-friendly semantics.

### 6) Layout projection subsystem

- Projection manager: `package/src/projection/projection-manager.ts`.
- Handles:
  - snapshot/measure/update cycles
  - tree rebuild and parent path tracking
  - layout and layoutId transitions
  - crossfade/lead-follow stack behavior
  - transform correction and scale correction
- Changes here are high-risk; require integration + projection tests.

### 7) Gestures and viewport

- Gesture orchestration: `package/src/gestures/use-gestures.ts` and `package/src/gestures/use-drag.ts`.
- Maintain parity for hover/tap/focus/pan/drag and viewport triggers.
- Keep pointer/keyboard accessibility behavior intact.

### 8) Motion config and reduced motion

- Config context: `package/src/component/motion-config.tsx`.
- Reduced motion modes: `always`, `never`, `user`.
- Reduced motion behavior should disable transform-heavy motion appropriately while preserving non-transform signals when possible.

## Key files to update when adding/changing features

- Public types: `package/src/types/motion.ts`
- Motion prop allowlist: `package/src/component/motion-keys.ts`
- Component wiring: `package/src/component/create-motion-component.tsx`
- Animation behavior: `package/src/animation/use-animation-state.ts`
- Variant logic: `package/src/animation/variants.ts`
- Render/transform normalization: `package/src/animation/render.ts`
- Presence behavior: `package/src/component/presence.tsx`
- Layout projection: `package/src/projection/projection-manager.ts`
- Public exports: `package/src/index.ts`, `package/src/component/index.tsx`

## Testing policy

Primary suites (all under `package/tests`):

- `animation/` for transitions, keyframes, variants, stagger, defaults
- `component/` for motion component, config, presence hooks
- `integration/` for enter/exit, orchestration, gestures, viewport, layout animation
- `projection/` for geometry, scheduling, style correction, transform math
- `playwright/` for browser-level race/layout/keyboard/reduced-motion scenarios

Required verification after meaningful library changes:

- `bun --filter motion-solid typecheck`
- `bun --filter motion-solid test`
- `bun --filter motion-solid build`
- `bun --filter motion-solid test:browser` (for gesture/presence/layout changes)

If docs are changed:

- `bun --filter @motion-solid/docs build`

## Performance and correctness guardrails

- Minimize layout thrash: batch reads and writes, avoid repeated computed-style reads in loops.
- Keep render scheduling explicit (`frame.render`, microtask/raf boundaries).
- Do not regress exit handoff correctness.
- Do not regress layout projection cleanup/reset behavior.
- Preserve pointer-events/opacity/transform composition semantics when projection is active.

## Change workflow checklist (must follow)

- Confirm intended behavior against Framer Motion semantics.
- Implement with Solid-compatible API and kebab-case-first key handling.
- Update relevant tests or add new ones.
- Update docs (`AGENTS.md`, package README, docs site pages) in same change.
- Run verification commands.
- If any divergence remains, explicitly document it.

## Definition of done

- Code, types, tests, and docs are aligned.
- `AGENTS.md` has been updated for the change.
- Behavior remains Framer Motion-aligned or divergence is explicitly documented.
- API remains SolidJS-native (Accessors, kebab-case conventions, Solid reactive design choices).

## Recent updates (2026-02-20)

- Motion target typings now accept CSS custom property keys (`--*`) in `initial`/`animate`/`exit` targets, matching runtime behavior.
- `AnimatePresence` `mode="popLayout"` now restores root inline `position`, `min-width`, and `min-height` after the last exit completes.
- Shared `layoutId` handoff now synchronizes projection-node presence so exiting leads relegate to a still-present member instead of self-selecting.
- Function variant resolvers that return variant labels now resolve those labels against local `variants` instead of being discarded.
- Nested `AnimatePresence` now gates parent-driven child exit handoff behind `propagate`, so `propagate={false}` does not trigger nested child exits on parent removal.
- Projection transform building now sanitizes zero/non-finite tree scales before translate and inverse-scale math to avoid `Infinity`/`NaN` transform output.
