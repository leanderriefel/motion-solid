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
  motionKeys,
  AnimatePresence,
  PresenceContext,
  usePresence,
  type AnimatePresenceProps,
  type PresenceContextValue,
  motion,
  type MotionProxy,
} from "./component";

export { useAnimationState } from "./animation";

export {
  animationTypes,
  type AnimationType,
  type AnimationTypeTargets,
  type AnimationTypeValuesMap,
  buildAnimationTypeMotionValues,
} from "./animation";

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
} from "./types";

export { isSVGElement, isHTMLElement } from "./types";

export { createMotionState } from "./state";

export { useGestures } from "./gestures";
