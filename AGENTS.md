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
- Interactive docs demos live in `docs/src/components/demos`; keep the shared underline demo (`LayoutGroup` + `layoutId`), the reshuffling list demo (`layout` sibling reordering plus internal size changes), the gesture playground (single draggable square with axis-lock toggles), and the foreground card selection demo (shared-layout handoff into a modal-style overlay) aligned with runtime behavior and docs.
- CI workflows: `.github/workflows`
- Docs app: client bootstrap in `docs/src/entry-client.tsx` must default-export the `StartClient` mount function for Vinxi/Solid Start production builds. Side-effect-only mounting breaks the deployed site with a client boot error (`TypeError: e is not a function`). Do not use a top-level `"use client"` directive in docs components (e.g. `background-dots.tsx`); it is ignored by the current docs toolchain and only adds noisy build warnings.

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
- Motion target typings accept CSS custom property keys (`--*`) in `initial`/`animate`/`exit` targets, matching runtime behavior.

## Framer Motion parity requirements

- Align semantics with Framer Motion internals for:
  - variant resolution and inheritance
  - transition overrides (`default`, per-key)
  - gesture layering precedence
  - AnimatePresence lifecycle and exit handoff
  - layout animation props (`layout`, `layoutId`, `layoutDependency`, `layoutScroll`, `layoutRoot`, `layoutCrossfade`)
  - `LayoutGroup`, shared layout handoff, and `AnimatePresence mode="popLayout"`
- Before changing behavior, verify parity assumptions in source and tests.
- If parity is impossible due to Solid runtime differences, document the exact behavior and rationale.
- Current documented divergence:
  - Solid disposes exiting component owners, so the exiting subtree does not remain reactively alive the way `motion/react` can. Retained exit nodes complete through a DOM-side exit callback bridge rather than a live exiting subtree owner. `onExitComplete`, `propagate`, and DOM-backed exit handoff are parity targets; long-lived async `safeToRemove` flows inside an already-removed subtree are not React-identical and must stay explicitly documented. This difference must remain documented anywhere `usePresence` / manual exit control is described.

## Architecture deep dive

### 1) Public surface and component factory

- Entry exports are centralized in `package/src/index.ts`.
- `motion` proxy in `package/src/component/index.tsx` lazily caches generated components per tag.
- `createMotionComponent(tag)` in `package/src/component/create-motion-component.tsx` renders intrinsic tags through Solid's normal `<Dynamic>` path. Hydration safety depends on materializing the host element once per component instance and keeping child resolution inside a dedicated inner component under `MotionContext`; repeatedly reading raw `props.children` inside layout/reactive tracking will recreate child JSX and break hydration.
- `motion.create(Component, options)` is part of the public surface. Layout-capable custom components must forward the received `ref` prop to a single DOM/SVG host.
- `package/tsup.config.ts` forces the published browser build through `solidPlugin({ solid: { generate: "dom", hydratable: true } })`. Do not drop `hydratable: true`, or published SSR consumers will regress even if the workspace docs app still looks fine.

### 2) Prop processing and state wiring

- Motion props are split using `splitProps(..., motionKeys)`.
- `MotionConfig` defaults are merged into per-component options.
- Presence-aware overrides are applied (`initial`, `custom`, entrance blocking behavior).
- Runtime state now lives in upstream `motion-dom` `VisualElement` instances:
  - `HTMLVisualElement` / `SVGVisualElement`
  - `latestValues`
  - render state
  - projection node
  - animation state
  - variant tree
  - presence context
- Solid-specific wiring is layered around that runtime in:
  - `package/src/component/create-dom-visual-element.ts`
  - `package/src/component/visual-state.ts`
  - `package/src/component/feature-definitions.ts`
  - `package/src/component/create-motion-component.tsx`

### 3) Animation engine flow

- The live runtime is the upstream Motion feature pipeline hanging off `VisualElement.animationState`.
- `createMotionComponent()` is responsible for:
  - creating the correct `VisualElement`
  - mounting/unmounting it against the DOM ref
  - updating Motion props and presence context
  - calling `updateFeatures()` / `animateChanges()`
  - filtering DOM props and converting internal style keys back to DOM-safe output
- Intrinsic motion hosts must keep the same element shape on the server and client. Do not reintroduce manual `template()` / `getNextElement()` / `ssrElement()` host wiring or any other SSR/client-specific host branch for standard HTML/SVG tags.
- Do not read raw `props.children` in layout tracking/effects. Keep child resolution inside the dedicated inner host-children component and memoize that read there; otherwise motion components can recreate child JSX during hydration or resolve nested motion children outside `MotionContext`.
- `useAnimationState` remains in the repo for older/isolated helpers, but it is not the source of truth for the primary motion component runtime anymore.
- Animation type priority should continue to follow upstream Motion ordering unless parity research and tests justify a change.
- `onAnimationComplete` fires exactly once per completed animate cycle; stale/cancelled/replaced animation runs from reactive reruns no longer invoke duplicate callbacks. Completion scheduling is guarded by per-type cycle IDs inside `startAnimations()`.

### 4) Variant resolution and inheritance

- Resolution lives in `package/src/animation/variants.ts`.
- Supports:
  - target objects
  - variant labels
  - function variants
  - parent variant inheritance when `inherit !== false`
- Function variant resolvers that return variant labels resolve those labels against local `variants` instead of being discarded.
- Key normalization flows through transform normalization; avoid introducing duplicate key aliases that create ambiguity.

### 5) Presence and exit lifecycle

- Presence context and hooks live in `package/src/component/presence.tsx`.
- `AnimatePresence` supports `mode`: `sync`, `wait`, `popLayout`.
- Nested `AnimatePresence` gates parent-driven child exit handoff behind `propagate`, so `propagate={false}` does not trigger nested child exits on parent removal.
- Exit lifecycle relies on retained DOM + completion signaling (`onExitComplete`) and exit handoff for unmounting motion components.
- Exit handoff promotes the `exit` animation through `VisualElement.animationState.setActive("exit", true)` and suppresses stale queued `animateChanges()` microtasks during cleanup, avoiding enter-vs-exit races under parallel browser load.
- Because exiting Solid owners are disposed, retained exit nodes complete through a DOM-side callback bridge (`__motionHandleExitComplete`) instead of a live exiting subtree context.
- Presence APIs expose Accessors and Solid-friendly semantics.

### 6) Layout and projection

- Layout support is implemented through upstream `motion-dom` projection nodes:
  - `HTMLProjectionNode`
  - `nodeGroup()`
  - projection scale correctors for border radius and box shadow
- Solid layout glue lives in:
  - `package/src/component/layout-group.tsx`
  - `package/src/component/layout-group-context.ts`
  - `package/src/component/switch-layout-group-context.ts`
  - `package/src/component/layout-hooks.ts`
- The motion host mirrors Motion’s layout timing split:
  - pre-commit snapshots via `createComputed(...projection.willUpdate())`
  - post-commit flush via microtask `projection.root.didUpdate()`
- Public layout surface includes:
  - `layout`
  - `layoutId`
  - `layoutDependency`
  - `layoutScroll`
  - `layoutRoot`
  - `layoutCrossfade`
  - `LayoutGroup`
  - `useInstantLayoutTransition`
  - `useResetProjection`
- A dedicated layout docs page lives at `docs/src/routes/docs/layout-animations.mdx`. Keep that page, the demos page, and the layout-related README notes updated together.
- `borderRadius` and `boxShadow` correction only applies when Motion can see those values on the projecting motion node itself (`style`, `initial`, `animate`, or `exit`). Class-only radius/shadow styling on the layout surface will not be corrected.
- Shared-layout patterns driven by external Solid selection state should use `layoutDependency` when the source/target motion hosts do not directly read that signal themselves.
- Sibling reordering inside Solid control flow (for example `For` resorting a `layout` list) must animate from the previous committed layout. The runtime currently restores this by snapshotting the subtree from its last measured layout when a motion host's child list mutates, then forcing a projection update.
- `LayoutGroup.forceRender()` invalidates the provider value without recreating its underlying `nodeGroup()`, so `presenceAffectsLayout` exit completion can refresh grouped layout consumers in Solid without breaking shared-layout membership.

### 7) Gestures and viewport

- Gesture orchestration: `package/src/gestures/use-gestures.ts` and `package/src/gestures/use-drag.ts`.
- Drag is mounted through `package/src/features/drag-feature.ts`, which wires drag lifecycle directly into the upstream `VisualElement` feature pipeline. Keep docs demos and browser harness coverage aligned with that path; do not reintroduce a second store-driven drag runtime for motion components.
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
- VisualElement wiring: `package/src/component/create-dom-visual-element.ts`
- Visual state creation: `package/src/component/visual-state.ts`
- Feature wiring: `package/src/component/feature-definitions.ts`
- Variant logic: `package/src/animation/variants.ts`
- Render/transform normalization: `package/src/animation/render.ts`
- Presence behavior: `package/src/component/presence.tsx`
- Layout behavior: `package/src/component/layout-group.tsx`, `package/src/component/layout-hooks.ts`
- Public exports: `package/src/index.ts`, `package/src/component/index.tsx`

## Testing policy

Primary suites (all under `package/tests`):

- `animation/` for transitions, keyframes, variants, stagger, defaults
- `component/` for motion component, config, presence hooks
- `integration/` for enter/exit, orchestration, gestures, viewport
- `playwright/` for browser-level race/presence/keyboard/reduced-motion scenarios

Regression coverage explicitly exercises: layout projection creation/filtering, Solid `For` sibling reordering, `LayoutGroup` layoutId namespacing, `layoutDependency` measurement gating, `motion.create` ref/prop forwarding, and browser-level layout/shared-layout plus `AnimatePresence mode="popLayout"` retention.
Regression coverage must also include browser-level drag movement/axis locking and layout scale correction on a projecting node with `borderRadius`/`boxShadow`.

Required verification after meaningful library changes:

- `bun --filter motion-solid typecheck`
- `bun --filter motion-solid test`
- `bun --filter motion-solid build`
- `bun --filter motion-solid test:browser` (for gesture/presence changes)

SSR/hydration regressions must be verified in a real hydratable browser build (`docs` build/start or equivalent). The Vitest/jsdom transform in this repo is not configured as a hydratable Solid client build, so hydration-specific failures can be missed there.

If docs are changed:

- `bun --filter @motion-solid/docs build`

## Performance and correctness guardrails

- Keep render scheduling explicit (`frame.render`, microtask/raf boundaries).
- Avoid unnecessary computed-style reads in hot paths.
- Do not regress exit handoff correctness.
- Preserve pointer-events/opacity/transform composition semantics across animated style updates.

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
