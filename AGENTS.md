# motion-solid (agent notes)

## Commands

- Build: `bun --filter motion-solid build`
- Typecheck: `bun --filter motion-solid typecheck`
- Test: `bun --filter motion-solid test` (runs build + test.ts)
- Dev docs: `bun dev`
- Format: `bun run format` (prettier)

## Code Style

- 2-space indent, double quotes, trailing commas, semicolons (prettier enforced)
- TypeScript strict mode, no `any`/`as any` (prefer generics, typed wrappers at boundaries)
- Performance-first: minimize DOM reads/writes, avoid reactive thrash
- Use `splitProps` to strip motion-specific props, add new keys to `motionKeys`
- SSR-safe: avoid effects for initial render, keep server-only logic in props
- Imports: separate Solid imports from third-party, use type imports for types only

## Architecture

- `createMotionComponent(tag)` wraps intrinsic elements via `solid-js/web` `Dynamic`
- Motion props: initial, animate, exit, variants, transition, gesture handlers
- Presence integration via `PresenceContext`, exit animations call `onExitComplete`
- Use `createMemo` for derived computations, `createEffect` only when necessary
