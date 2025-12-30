// Main exports
export {
  createMotionComponent,
  type MotionProps,
  MotionStateContext,
  useMotionState,
  MotionConfig,
  MotionConfigContext,
  useMotionConfig,
  type MotionConfigContextValue,
  type MotionConfigProps,
  type ReducedMotionConfig,
  motionKeys,
  AnimatePresence,
  PresenceContext,
  useIsPresent,
  usePresence,
  usePresenceData,
  type AnimatePresenceProps,
  type PresenceContextValue,
  motion,
  type MotionProxy,
} from "./component/index";

export { useAnimationState } from "./animation";

export {
  animationTypes,
  type AnimationType,
  type AnimationTypeTargets,
  type AnimationTypeValuesMap,
  buildAnimationTypeMotionValues,
} from "./animation";

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
  MotionGesturesState,
  MotionVariantsState,
  MotionOptions,
  MotionState,
  StyleTransformShortcuts,
  MotionStyle,
  Variant,
  Variants,
} from "./types";

export { isSVGElement, isHTMLElement } from "./types";

export { createMotionState } from "./state";

export { useGestures, createDragControls, type DragControls } from "./gestures";

export { useReducedMotion } from "./hooks";

export type { Transition } from "./types";
