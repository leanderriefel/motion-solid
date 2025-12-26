import type { MotionOptions } from "../types";

export const motionKeys: readonly (keyof MotionOptions)[] = [
  // animation / variants
  "initial",
  "animate",
  "exit",
  "variants",
  "transition",

  // callbacks
  "onUpdate",
  "onAnimationStart",
  "onAnimationComplete",
  "onBeforeLayoutMeasure",
  "onLayoutMeasure",
  "onLayoutAnimationStart",
  "onLayoutAnimationComplete",

  // pan
  "onPan",
  "onPanStart",
  "onPanSessionStart",
  "onPanEnd",

  // hover
  "whileHover",
  "onHoverStart",
  "onHoverEnd",

  // tap
  "onTap",
  "onTapStart",
  "onTapCancel",
  "whileTap",
  "globalTapTarget",

  // focus
  "whileFocus",

  // viewport
  "whileInView",
  "onViewportEnter",
  "onViewportLeave",
  "viewport",

  // drag
  "drag",
  "whileDrag",
  "dragDirectionLock",
  "dragPropagation",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
  "dragTransition",
  "dragControls",
  "dragSnapToOrigin",
  "dragListener",
  "onMeasureDragConstraints",
  "_dragX",
  "_dragY",

  // drag handlers
  "onDragStart",
  "onDrag",
  "onDragEnd",
  "onDirectionLock",
  "onDragTransitionEnd",

  // layout
  "layout",
  "layoutId",
  "layoutScroll",
  "layoutRoot",
  "layoutCrossfade",
  "layoutDependencies",
  "data-framer-portal-id",

  // advanced
  "custom",
  "inherit",
  "ignoreStrict",
  "values",
  "transformTemplate",
  "data-framer-appear-id",
];
