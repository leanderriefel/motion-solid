# motion-solid

[SolidJS](https://solidjs.com) bindings for [Motion](https://motion.dev).

Please refer to the [docs](https://motion-solid.leanderriefel.com) for more information.

Please note that this library is still in early beta and the API is subject to change and may get daily breaking changes. The documentation may not be up to date with the latest features and may include missing or outdated information. You can always create an issue on [GitHub](https://github.com/leanderriefel/motion-solid) or, even better, open a pull request to fix the documentation or add new features.

## Maintenance status

`motion-solid` is currently only half-maintained. I currently have a lot of stress with university and private stuff, so updates will be very slow and there will likely be long periods without updates.

I will still respond to issues and pull requests. The library should generally work fine, but there can still be rough edges while the API settles.

Recent fixes in `0.3.x` include:

- TypeScript target typing now accepts CSS custom properties (`--*`) in `initial`/`animate`/`exit`.
- `AnimatePresence` `mode="popLayout"` now restores root inline layout styles after exits complete.
- Shared `layoutId` handoff now avoids promoting exiting nodes during lead relegate.
- Function variants that return variant labels are now resolved at runtime (matching the public Variant type contract).
- Nested `AnimatePresence` with `propagate={false}` no longer triggers child exit handoff during parent removal.
- Layout projection transform building now guards zero/non-finite tree scales to avoid `Infinity`/`NaN` CSS output.

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
