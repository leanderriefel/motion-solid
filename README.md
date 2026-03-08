# motion-solid

This is the repo for the `motion-solid` npm package (still in very early beta).

- Package README: [package/README.md](package/README.md)
- Docs (still very work-in-progress) README: [docs/README.md](docs/README.md)

## Maintenance status

`motion-solid` is currently only half-maintained. I currently have a lot of stress with university and private stuff, so updates will be very slow and there will likely be long periods without updates.

I will still respond to issues and pull requests. The library should generally work fine, but there will still be issues around exit animations and TypeScript types while the API settles.

The runtime has been rebuilt around upstream `motion-dom` `VisualElement`/projection internals. Current scope includes layout animations (`layout`, `layoutId`, `LayoutGroup`, `useInstantLayoutTransition`, `useResetProjection`), `AnimatePresence mode="popLayout"`, and `motion.create(Component, options)` for custom components that forward `ref` to a single DOM/SVG host node.

One known divergence remains in exit handoff: Solid disposes exiting component subtrees, so retained exit DOM nodes complete through a DOM-side callback bridge. In practice `popLayout` and shared/layout projection handoff work, but async `safeToRemove` flows inside an already-disposed exiting subtree are not React-identical.

If you want to seriously maintain this and help make it fully fledged, please open an issue or DM me on X: [@leanderriefel](https://x.com/leanderriefel).

Contact: riefel.leander@gmail.com
