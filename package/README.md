# motion-solid

[SolidJS](https://solidjs.com) bindings for [Motion](https://motion.dev).

Please refer to the [docs](https://motion-solid.leanderriefel.com) for more information.

Please note that this library is still in early beta and the API is subject to change and may get daily breaking changes. The documentation may not be up to date with the latest features and may include missing or outdated information. You can always create an issue on [GitHub](https://github.com/leanderriefel/motion-solid) or, even better, open a pull request to fix the documentation or add new features.

## Maintenance status

`motion-solid` is currently only half-maintained. I currently have a lot of stress with university and private stuff, so updates will be very slow and there will likely be long periods without updates.

I will still respond to issues and pull requests. The library should generally work fine, but there can still be rough edges while the API settles.

## Current scope

Current public surface includes:

- `motion.*` HTML/SVG components backed by upstream `motion-dom` `VisualElement`
- `AnimatePresence` with `mode="sync" | "wait" | "popLayout"`
- layout animation props: `layout`, `layoutId`, `layoutDependency`, `layoutScroll`, `layoutRoot`, `layoutCrossfade`
- `LayoutGroup`, `useInstantLayoutTransition`, `useResetProjection`
- `motion.create(Component, options)` for custom components that forward `ref` to a single DOM/SVG host node

## Divergence

Solid disposes exiting component owners as soon as they leave the tree. `motion-solid` retains the DOM node for exit/layout handoff, but the exiting subtree itself is no longer reactively alive the way `motion/react` can keep it alive.

This means:

- exit animations and `onExitComplete` still work
- `popLayout` and shared/layout projection handoff still work
- long-lived async `safeToRemove` flows inside an already-removed subtree are not React-identical and should be avoided in favor of parent-managed state or `onExitComplete`

If you want to seriously maintain this and help make it fully fledged, please open an issue or DM me on X: [@leanderriefel](https://x.com/leanderriefel).

## Installation

```bash
npm install motion-solid
# or
yarn add motion-solid
# or
pnpm add motion-solid
# or
bun add motion-solid
```

## License

MIT

Contact: riefel.leander@gmail.com
