# motion-solid

SolidJS motion components powered by Motion One (`motion`).

## Usage

```tsx
import { createSignal } from "solid-js"
import { motion, AnimatePresence } from "motion-solid"

function Example() {
  const [open, setOpen] = createSignal(true)

  return (
    <>
      <button onClick={() => setOpen((v) => !v)}>Toggle</button>
      <AnimatePresence when={open()}>
        <motion.div
          initial={{ opacity: 0, x: "100px" }}
          animate={{ opacity: 1, x: "0" }}
          exit={{ opacity: 0, x: "-100px" }}
          transition={{ duration: 0.6 }}
        />
      </AnimatePresence>
    </>
  )
}
```

## Notes

- `motion.<tag>` works for every intrinsic element (created lazily).
- `inherit` defaults to `true`: `variants`, `transition`, and `custom` inherit/merge from the nearest motion parent unless `inherit={false}`.
- Utilities like `transform` are available via `motion-solid/transform`.
- Supported gestures: `whileHover`/`onHoverStart`/`onHoverEnd`, `whileTap`/`onTapStart`/`onTap`/`onTapCancel`, `whileInView`/`viewport`/`onViewportEnter`/`onViewportLeave`.
