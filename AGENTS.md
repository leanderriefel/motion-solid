# motion-solid (agent guide)

This file is the maintenance contract for this repo. Keep it aligned with the code.

## What This Repo Is

- `motion-solid` is a SolidJS-first Motion library built on top of upstream `motion-dom`.
- The local package version is `0.5.0`.
- The workspace currently pins published `motion-dom` `^12.35.1`.
- The component runtime is not a local store-driven animation engine. Motion component state lives on upstream `motion-dom` objects.
- The framework layer is a Solid translation of the framework-owned pieces that live in `motion/react`.
- This repo is not a byte-for-byte port of `motion/react`. Most remaining parity bugs live in the translated orchestration layer, not the `motion-dom` engine.

## Hard Rules

- Do not reintroduce a `createStore` / `MotionState`-style runtime for motion components.
- Treat `motion-dom` as the source of truth for component animation state, projection state, and feature execution.
- Treat `motion/react` as the semantic reference for framework behavior: presence, layout timing, feature mounting, and shared-layout orchestration.
- Keep the public API Solid-native:
  - Accessors where reactive values are exposed
  - normal Solid `ref` prop behavior
  - SSR/hydration-safe rendering
  - kebab-case-first style and transform keys
- Every change must update `AGENTS.md` in the same branch.
- If public behavior, API, defaults, timing, caveats, or divergences change, update all relevant docs in the same change:
  - `AGENTS.md`
  - `package/README.md`
  - docs pages under `docs/src/routes/docs/*.mdx`
- If a behavior intentionally differs from Motion semantics, add an explicit divergence note in docs and tests.

## Repository Map

- Monorepo root uses Bun workspaces:
  - `package` = library
  - `docs` = docs site
- Library source: `package/src`
- Library tests: `package/tests`
- Docs pages: `docs/src/routes/docs`
- Interactive demos: `docs/src/components/demos`
- CI workflows: `.github/workflows`
- Upstream `motion-dom` repo: `tmp/motion-upstream`

Docs app note:

- Client bootstrap lives in `docs/src/entry-client.tsx`.
- The current docs build emits a Vinxi warning about a missing default export from `src/entry-client.tsx`, but the build still succeeds. If touching docs bootstrap, verify the real built site behavior, not just the warning text.
- Current sidebar docs targets live under `docs/src/routes/docs`:
  - `getting-started.mdx`
  - `demos.mdx`
  - `architecture-caveats.mdx`
  - `motion-component.mdx`
  - `layout-animations.mdx`
  - `variants.mdx`
  - `animate-presence.mdx`
  - `motion-config.mdx`
  - `hooks.mdx`
  - `gestures.mdx`
  - `drag.mdx`
- The docs layout TOC reads `h2` and `h3` inside `.docs-content`. Demo components must not render heading tags for demo titles or internal labels, otherwise they pollute the page TOC.

Package publishing note:

- `package/package.json` explicitly includes `README.md` in the published `files` list so installed package contents still carry the local package readme even if pack tooling or workspace behavior changes.

## Commands

Package manager:

- `bun`

Root:

- `bun install --frozen-lockfile`
- `bun dev`
- `bun run lint`
- `bun run lint:fix`
- `bun run format`
- `bun run format:check`

Library:

- `bun --filter motion-solid build`
- `bun --filter motion-solid typecheck`
- `bun --filter motion-solid test`
- `bun --filter motion-solid test:watch`
- `bun --filter motion-solid test:browser`

Docs:

- `bun --filter @motion-solid/docs dev`
- `bun --filter @motion-solid/docs build`
- `bun --filter @motion-solid/docs start`
- `bun --filter @motion-solid/docs typecheck`

## Architecture

### 1. What Comes From `motion-dom`

These are engine-owned pieces. Prefer using them directly over recreating them locally.

Runtime state and rendering:

- `HTMLVisualElement` / `SVGVisualElement`
- `VisualElement` state:
  - `latestValues`
  - render state
  - projection node
  - animation state
  - variant tree
  - presence context
- `createDomVisualElement()` in `package/src/component/create-dom-visual-element.ts` instantiates upstream visual elements.
- `createVisualState()` in `package/src/component/visual-state.ts` uses upstream scraping/build helpers from `motion-dom`.

Projection and layout:

- `HTMLProjectionNode`
- shared-layout stacks and promotion/relegation
- `nodeGroup()`
- scale correction for border radius and box shadow

Features and animation primitives:

- `setFeatureDefinitions()`
- `Feature`
- `animateVisualElement`
- gesture primitives used by hover/press/pan/in-view/focus features
- `animateMotionValue` from `motion-dom`, used inside drag behavior
- legacy animation controls subscriptions are feature-owned and must dispose the previous subscription before switching `animate` controls or leaving controls mode

Important consequence:

- For motion components, `motion-dom` owns the live animation/projection state.
- Local code should translate framework semantics into that engine, not duplicate the engine.

### 2. What We Translate From `motion/react` Into Solid

These are framework-owned behaviors. This repo has to translate them because `motion-dom` does not provide them.

Component factory and host wiring:

- `motion` proxy and intrinsic tag cache in `package/src/component/index.tsx`
- `motion.create(Component, options)`
- `createMotionComponent()` in `package/src/component/create-motion-component.tsx`

Context and config:

- `MotionContext`
- `MotionConfig`
- layout group context
- switch layout group context
- presence context

Framework timing translation:

- React `getSnapshotBeforeUpdate` equivalent:
  - `createComputed(...)`
  - calls `projection.willUpdate()` before Solid commits DOM updates
  - tracks host-children render revisions inside the inner host-children component and, for nested motion child mount/unmount churn, uses a `MotionContext` callback to synchronously trigger a deduped pre-commit `projection.willUpdate()` on ancestors before the child DOM commits
  - on child-driven or layout-triggered host rerenders, broadcasts `willUpdate(false)` across the nearest projection snapshot subtree so descendant and sibling layout nodes are dirtied in the same pre-commit window, while stale already-dirty descendant snapshots from older projection cycles are refreshed instead of being reused across interrupted reversals
- React layout/update phase equivalent:
  - post-commit effect flush in the same update cycle
  - coalesces to exactly one `projection.root.didUpdate()` flush per projection root in the current frame/update turn so descendant child-content follow-up measurements cannot clear in-flight projection started by an earlier pre-commit snapshot
  - child-list `MutationObserver` recovery remains a post-mutation fallback and must bail when the same host already entered a pre-commit measurement cycle; when it does run, it must not trigger a second same-frame root flush or it can cancel in-flight layout projection
  - first committed projection mounts only run the recovery `didUpdate()` path when that component instance already entered its own snapshot/unmount lifecycle; snapshot history must not leak across unrelated component instances
- mount/unmount translation:
  - `onMount`
  - `onCleanup`
- animation-change scheduling:
  - `requestAnimationFrame`
  - `queueMicrotask`

Presence and exit orchestration:

- `AnimatePresence`
- presence hooks
- retained DOM exit bridge
- `mode="sync" | "wait" | "popLayout"` with `popLayout` as the current default in `motion-solid`
- `propagate`
- `presenceAffectsLayout`
- `root`, `anchorX`, `anchorY` for `popLayout`

Layout orchestration:

- `LayoutGroup`
- `useInstantLayoutTransition`
- `useResetProjection`
- `layoutId` namespacing through layout group ids
- Solid invalidation signals such as `forceRenderVersion`

SSR and hydration translation:

- Intrinsic motion elements must render the same host shape on server and client.
- `createMotionComponent()` must not branch to different intrinsic host implementations between SSR and client hydration.
- Child resolution must stay inside the dedicated inner host-children component under `MotionContext`. Reading raw `props.children` in layout/effect tracking can recreate child JSX and break hydration.

### 3. What Is Still Local To `motion-solid`

These are repo-owned layers. They should stay thin and be kept parity-tested.

Prop processing and DOM output:

- prop splitting with `motionKeys`
- prop filtering
- Motion/Solid prop normalization
- DOM-safe style output

Solid-first API surface:

- kebab-case transform/style key conventions
- Solid-oriented types and public helpers
- `createDragControls()` public helper

Variant and target resolution:

- `package/src/animation/variants.ts`
- local target merging / transition lookup helpers

Standalone helper surface:

- files under `package/src/animation/*` that expose direct animation helpers
- these are not the motion-component runtime

Docs and harness:

- docs demos
- Playwright harness scenarios
- browser regression helpers
- optional browser-only layout timing diagnostics via `window.__MOTION_SOLID_LAYOUT_DEBUG__` or the `motion-solid-layout-debug` / `localStorage['motion-solid-layout-debug']` bootstrap in `create-motion-component.tsx`, with copy helpers exposed on `window.__MOTION_SOLID_LAYOUT_DUMP__` and `window.__MOTION_SOLID_LAYOUT_COPY__`

## Key Runtime Files

Public exports:

- `package/src/index.ts`
- `package/src/component/index.tsx`

Motion host:

- `package/src/component/create-motion-component.tsx`
- `package/src/component/create-dom-visual-element.ts`
- `package/src/component/visual-state.ts`
- `package/src/component/feature-definitions.ts`

Context/config:

- `package/src/component/motion-context.ts`
- `package/src/component/motion-config.tsx`

Presence:

- `package/src/component/presence.tsx`

Layout:

- `package/src/component/layout-group.tsx`
- `package/src/component/layout-group-context.ts`
- `package/src/component/switch-layout-group-context.ts`
- `package/src/component/layout-hooks.ts`

Variants and helper animation logic:

- `package/src/animation/variants.ts`
- `package/src/animation/index.ts`

Gestures:

- `package/src/features/drag-feature.ts`
- `package/src/gestures/use-drag.ts`

## Solid-Specific Contracts

- Public style and transform keys are kebab-case first:
  - `scale-x`
  - `rotate-y`
  - `transform-perspective`
  - `origin-x`
- Do not add new camelCase public aliases for Motion CSS/transform keys.
- CSS variables (`--*`) must pass through unchanged.
- Layout-capable custom components must forward the received `ref` prop to one DOM/SVG host.
- Avoid client-only DOM reads on the server.
- Keep initial SSR output deterministic.

## Current Divergences And Caveats

Exiting owners:

- Solid disposes exiting component owners immediately.
- `motion-solid` retains DOM nodes for exit/layout handoff, but the exiting subtree is not reactively alive the way `motion/react` can keep it alive.
- Exit completion therefore uses a DOM-side callback bridge rather than a live exiting subtree owner.

Implications:

- `exit`, `onExitComplete`, shared layout handoff, and `popLayout` are supported.
- Long-lived async `safeToRemove` flows inside already-removed exiting subtrees are not React-identical.

Layout/style correction caveat:

- `borderRadius` and `boxShadow` correction only works when Motion can see those values on the projecting motion node itself via `style`, `initial`, `animate`, or `exit`.
- Class-only radius/shadow styling is not visible to Motion’s scale correctors.

Reality check:

- The runtime is upstream-backed, but the framework layer is still a translated Solid implementation.
- When a parity bug appears after real testing, assume the issue may be in presence/layout timing or shared-layout orchestration rather than in `motion-dom` itself.

## Testing Policy

Primary suites:

- `package/tests/animation`
- `package/tests/component`
- `package/tests/integration`
- `package/tests/playwright`

Layout/browser regressions must cover more than “a transform happened”.
Prefer assertions on:

- continuity of geometry across frames
- shared-layout interrupted reopen behavior
- non-zero corrected border radius during projection
- sibling reflow continuity
- position-only text wrappers avoiding scale distortion

Current required regression coverage includes:

- layout projection creation/filtering
- Solid `For` sibling reordering
- multi-step list expansion switches
- `layout="position"` visual-size continuity
- interrupted shared-layout reopen continuity
- `LayoutGroup` layout id namespacing
- `layoutDependency` measurement gating
- `motion.create` ref/prop forwarding
- browser-level shared layout and `AnimatePresence mode="popLayout"`
- browser-level shared tab background staying behind its label during handoff
- docs-route foreground first open after reload
- docs-route repeated list expansion continuity for the reshuffling demo
- docs-route rapid sync/feed list alternation driven by real clicks
- browser-level drag movement and axis locking
- browser-level scale correction for `borderRadius` and `boxShadow`

Browser testing note:

- Tests that use `elementFromPoint()` for shared-layout/top-layer assertions must scroll the target stage into view first. Otherwise viewport misses can create fake z-order failures.

Verification after meaningful library changes:

- `bun --filter motion-solid typecheck`
- `bun --filter motion-solid test`
- `bun --filter motion-solid build`
- `bun --filter motion-solid test:browser`

If docs pages are changed:

- `bun --filter @motion-solid/docs build`

Hydration changes must be verified in a real hydratable browser build. The Vitest/jsdom setup in this repo does not reliably catch hydration-specific failures.

## Change Checklist

- Confirm which part of the stack owns the behavior:
  - `motion-dom` engine
  - `motion/react` semantics being translated
  - local Solid-specific helper layer
- Prefer deleting legacy local behavior over layering another runtime on top of `motion-dom`.
- Keep public API Solid-native and kebab-case first.
- Add or update regression tests for the real failure mode.
- Update `AGENTS.md` and other relevant docs in the same change.
- Run the appropriate verification commands.
- Document divergences explicitly if they remain.

## Definition Of Done

- Code, tests, and docs describe the same behavior.
- `AGENTS.md` is updated.
- The architecture description stays truthful:
  - what `motion-dom` owns
  - what is translated from `motion/react`
  - what remains local to `motion-solid`
- Public API remains Solid-native even when internal behavior follows Motion semantics.
