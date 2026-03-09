// Main exports
export {
  createMotionComponent,
  type MotionProps,
  MotionConfig,
  MotionConfigContext,
  useMotionConfig,
  type MotionConfigContextValue,
  type MotionConfigProps,
  type ReducedMotionConfig,
  motionKeys,
  AnimatePresence,
  LayoutGroup,
  PresenceContext,
  usePresenceContext,
  useIsPresent,
  usePresence,
  usePresenceData,
  useInstantLayoutTransition,
  useResetProjection,
  type AnimatePresenceProps,
  type AnimatePresenceMode,
  type LayoutGroupProps,
  type PresenceContextValue,
  motion,
  type MotionProxy,
} from "./component/index";

export {
  stagger,
  isStaggerFunction,
  type StaggerOptions,
  type StaggerFunction,
} from "./animation/stagger";

// Types
export type {
  HTMLElements,
  SVGElements,
  Elements,
  ElementTag,
  ElementInstance,
  MotionElement,
  MotionValues,
  MotionGoals,
  MotionOptions,
  StyleTransformShortcuts,
  MotionStyle,
  Variant,
  Variants,
} from "./types";

export { isSVGElement, isHTMLElement } from "./types";

export { createDragControls, type DragControls } from "./gestures";

export { useReducedMotion } from "./hooks";

export type { Transition } from "./types";
