# motion-solid

SolidJS bindings for [Motion](https://motion.dev), built around upstream `motion-dom`.

Docs: [motion-solid.leanderriefel.com](https://motion-solid.leanderriefel.com)

## Status

`motion-solid` is still alpha.

That means:

- breaking changes are still possible
- parity gaps still exist
- the public API is intended to feel Solid-native even when the internal behavior follows Motion semantics

## Architecture

The important split is:

### What comes directly from `motion-dom`

This library uses upstream `motion-dom` as the component engine.

For motion components, `motion-dom` owns:

- `VisualElement` state
- `HTMLVisualElement` / `SVGVisualElement`
- projection state and `HTMLProjectionNode`
- animation state
- shared-layout stacks
- scale correction for layout projection
- feature registration and execution

This is the core runtime. `motion-solid` should not grow a second store-driven component engine alongside it.

### What `motion-solid` translates from `motion/react`

`motion-dom` does not provide the framework layer. `motion-solid` has to translate the framework-owned behavior that `motion/react` normally handles:

- `motion` component factory and proxy
- `motion.create(Component, options)`
- `MotionConfig`
- `MotionContext`
- `AnimatePresence`
- `LayoutGroup`
- `useInstantLayoutTransition`
- `useResetProjection`
- layout timing around `projection.willUpdate()` / `projection.root.didUpdate()`
- exit retention and `popLayout`
- SSR and hydration-safe host rendering for Solid

This is the layer where most remaining parity bugs usually live.

### What is still local to `motion-solid`

Some parts are intentionally local:

- Solid-first public types and helpers
- prop filtering and normalization
- kebab-case-first style/transform conventions
- local variant/target resolution helpers
- `createDragControls()`
- standalone animation helpers exposed from `package/src/animation/*`

These are not the same thing as the live motion-component runtime.

## Caveats and Limitations

This is not a direct port of `motion/react`.

The current architecture is:

- upstream `motion-dom` engine
- Solid translation of the framework layer from `motion/react`
- a small local Solid-specific API layer on top

So when a bug appears after real testing, it is often not because `motion-dom` is missing. It is usually because the translated presence/layout/lifecycle layer still differs from `motion/react` in some edge case.

## Current Public Surface

- `motion.*` HTML and SVG components
- `motion.create(Component, options)`
- `MotionConfig`
- `AnimatePresence`
- `LayoutGroup`
- `usePresence`
- `useIsPresent`
- `usePresenceData`
- `useInstantLayoutTransition`
- `useResetProjection`
- `createDragControls()`

Layout props currently exposed:

- `layout`
- `layoutId`
- `layoutDependency`
- `layoutScroll`
- `layoutRoot`
- `layoutCrossfade`

AnimatePresence modes:

- `sync`
- `wait`
- `popLayout`

## Solid-Specific Conventions

- Public transform/style keys are kebab-case first:
  - `scale-x`
  - `rotate-y`
  - `transform-perspective`
  - `origin-x`
- Custom components that need layout/projection must forward the received `ref` prop to one DOM or SVG host element.
- SSR and hydration should render the same host shape on server and client.

## Known Divergence

Solid disposes exiting component owners as soon as they leave the tree.

Because of that, `motion-solid` keeps the exiting DOM node around for exit/layout handoff, but the exiting subtree itself is no longer reactively alive in the same way it can be in `motion/react`.

In practice:

- `exit` still works
- `onExitComplete` still works
- shared layout handoff still works
- `popLayout` still works
- long-lived async `safeToRemove` flows inside an already-removed exiting subtree are not React-identical
- `mode="sync"` will look differently since we cannot "unexit" a component once it has started exiting, since we only have access to the DOM node, not the underlying exiting subtree. This is the reason why `mode="popLayout"` is the default.

## Practical Layout Notes

- `borderRadius` and `boxShadow` correction only works when Motion can see those values on the projecting motion node itself through `style`, `initial`, `animate`, or `exit`.
- If text can wrap differently between source and target, animate a shared wrapper with `layout="position"` instead of animating the text node directly.

## Installation

```bash
npm install motion-solid
```

Or:

```bash
yarn add motion-solid
pnpm add motion-solid
bun add motion-solid
```

## Contributing

If you work on parity bugs, debug the stack in this order:

1. Is the behavior already owned by `motion-dom`?
2. If yes, is the failure actually in the Solid translation of the `motion/react` layer?
3. If not, is the bug in a local helper layer like prop normalization, variants, docs demos, or test harness code?

Please keep docs and implementation aligned in the same change.

## License

MIT
