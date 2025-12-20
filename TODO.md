# motion-solid TODO

## Unimplemented Props

- [x] **Pan gestures** (`onPan`, `onPanStart`, `onPanSessionStart`, `onPanEnd`) - motion-keys.ts:21-24
- [x] **globalTapTarget** - make tap events listen on document - motion-keys.ts:36
- [x] **onMeasureDragConstraints** - callback when drag constraints are measured - motion-keys.ts:59
- [x] **dragPropagation** - control gesture propagation to parent draggables - motion-keys.ts:51
- [x] **\_dragX, \_dragY** - external MotionValues for drag position - motion-keys.ts:60-61
- [x] **dragControls** - programmatic drag control - motion-keys.ts:56
- [x] **inherit** - control variant inheritance from parent - motion-keys.ts:81
- [x] **layoutScroll** - trigger scroll measurement during layout animations - motion-keys.ts:74
- [x] **layoutRoot** - mark element as layout root for sticky positioning - motion-keys.ts:75

## Incomplete Implementations

- [x] **Variant orchestration** - `delayChildren`, `staggerChildren`, `staggerDirection`, `when` - use-animation-state.ts
- [x] **transitionEnd for gestures** - only applied for `animate`, not gesture animations - use-animation-state.ts:814-826
- [x] **viewport.once** - observer never disconnected after first intersection - use-gestures.ts:103
- [x] **viewport.amount numeric** - only handles `"all"`/`"some"`, not numeric values like `0.5` - use-gestures.ts:121
- [x] **activeVariants state** - defined in MotionState but never populated - state.ts:18
- [x] **MotionConfig options** - only handles `transition`, missing `reducedMotion`, `transformPagePoint` - motion-config.tsx

## Missing Features

- [ ] **useAnimationControls()** - imperative animation control API
- [ ] **useScroll()** - scroll-linked animations and scroll progress tracking
- [ ] **useMotionValue()** - standalone motion value creation hook
- [ ] **useTransform()** - derived/transformed motion values
- [ ] **useSpring()** - spring-physics reactive values
- [ ] **Reorder components** - `<Reorder.Group>` / `<Reorder.Item>` for drag-to-reorder
- [ ] **LayoutGroup** - coordinate layout animations across siblings
- [ ] **Path animations** - `pathLength`, `pathSpacing`, `pathOffset` for SVG

