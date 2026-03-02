# motion-solid

[SolidJS](https://solidjs.com) bindings for [Motion](https://motion.dev).

Please refer to the [docs](https://motion-solid.leanderriefel.com) for more information.

Please note that this library is still in early beta and the API is subject to change and may get daily breaking changes. The documentation may not be up to date with the latest features and may include missing or outdated information. You can always create an issue on [GitHub](https://github.com/leanderriefel/motion-solid) or, even better, open a pull request to fix the documentation or add new features.

## Maintenance status

`motion-solid` is currently only half-maintained. I currently have a lot of stress with university and private stuff, so updates will be very slow and there will likely be long periods without updates.

I will still respond to issues and pull requests. The library should generally work fine, but there can still be rough edges while the API settles.

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

## Layout animation notes

- Use `layout` for size/position projection transitions and `layoutId` for shared element handoff.
- For Solid reactivity-driven shifts, use `layoutDependency` (single) or `layoutDependencies` (multiple) to explicitly trigger layout measurement when needed.
- `layoutScroll` and `layoutRoot` can be combined for sticky/fixed/scroll-container scenarios.
- Layout projection now keeps border-radius/box-shadow scale-correction fallback values from style props and handles transformed ancestor scale compensation more reliably.
- Shared `layoutId` handoff state is now cleaned up immediately after completion so unrelated layout updates don't resurrect stale shared-element transitions.
- The layout engine now runs in explicit phases (`snapshot` -> `measure` -> `resolve` -> `projection`) with stale shared-state expiry to avoid hidden cross-update leakage.
- The docs include advanced stress demos (nested `AnimatePresence`, shared `layoutId`, grid reflow, and scroll+sticky projection) at:
  - https://motion-solid.leanderriefel.com/docs/demos

## License

MIT

Contact: riefel.leander@gmail.com
