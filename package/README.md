# motion-solid

SolidJS bindings for [Motion One](https://motion.dev).

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

## Usage

### Basic Animation

The `motion` component works with any HTML or SVG element.

```tsx
import { motion } from "motion-solid";

function App() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      Hello World
    </motion.div>
  );
}
```

### Variants & Orchestration

Use variants to define animation states and orchestrate children animations.

```tsx
import { motion } from "motion-solid";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function List() {
  return (
    <motion.ul variants={container} initial="hidden" animate="show">
      <motion.li variants={item}>Item 1</motion.li>
      <motion.li variants={item}>Item 2</motion.li>
      <motion.li variants={item}>Item 3</motion.li>
    </motion.ul>
  );
}
```

### Gestures

Support for hover, tap, focus, and drag gestures.

```tsx
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
  onHoverStart={() => console.log("hover start")}
>
  Click me
</motion.button>
```

### Viewport Animations

Animate elements when they enter the viewport.

```tsx
<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ once: true, amount: 0.5 }}
>
  I fade in when scrolled into view
</motion.div>
```

### AnimatePresence

Animate components when they are removed from the DOM.

```tsx
import { createSignal, Show } from "solid-js";
import { motion, AnimatePresence } from "motion-solid";

function Toggle() {
  const [isVisible, setIsVisible] = createSignal(true);

  return (
    <AnimatePresence>
      <Show when={isVisible()}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          I fade out when removed
        </motion.div>
      </Show>
    </AnimatePresence>
  );
}
```

### Drag

Make elements draggable.

```tsx
<motion.div drag dragConstraints={{ left: 0, right: 100, top: 0, bottom: 100 }}>
  Drag me
</motion.div>
```

## API

### `motion`

A proxy that creates motion components for any HTML/SVG element (e.g. `motion.div`, `motion.circle`).

**Props:**

- `initial`: Initial state (object or variant label).
- `animate`: Target state (object or variant label).
- `exit`: Target state when removing from DOM (requires `AnimatePresence`).
- `transition`: Animation options (duration, ease, etc.).
- `variants`: Object defining named animation states.
- `layout`: Boolean or "position" to animate layout changes.
- `drag`: Boolean, "x", or "y" to enable dragging.
- `whileHover`, `whileTap`, `whileFocus`, `whileInView`: Gesture animations.
- `onUpdate`, `onAnimationStart`, `onAnimationComplete`: Callbacks.

### `AnimatePresence`

Wraps components to enable exit animations. Ensure direct children are conditional (e.g., using `Show` or standard control flow).

**Props:**

- `initial`: Boolean (default `true`). Set to `false` to skip initial animation.
- `mode`: `"sync"` | `"wait"` | `"popLayout"`.
  - `sync`: (Default) Exiting children animate out while entering children animate in.
  - `wait`: Entering children wait until exiting children complete.
  - `popLayout`: Exiting children are removed from the layout flow immediately (useful for lists).

### `MotionConfig`

Set global configuration for all child motion components.

```tsx
<MotionConfig transition={{ duration: 0.5 }}>
  <App />
</MotionConfig>
```

## License

MIT
