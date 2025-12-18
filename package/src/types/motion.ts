import type {
  AnyResolvedKeyframe,
  MotionValue,
  MotionNodeOptions,
  VariantLabels,
} from "motion-dom";
import type { AnimationType } from "../animation/types";

export type MotionElement = HTMLElement | SVGElement;

export type MotionValues = Record<
  string,
  MotionValue<number> | MotionValue<string>
>;

export type MotionGoals = Record<string, AnyResolvedKeyframe>;

export interface MotionGesturesState {
  hover: boolean;
  tap: boolean;
  focus: boolean;
  drag: boolean;
  inView: boolean;
}

export type MotionVariantsState = Partial<
  Record<AnimationType | "initial", VariantLabels>
>;

/**
 * `motion-dom` currently includes some `any`-typed escape hatches (e.g. `custom`).
 * We keep our public surface `unknown`-typed and let callers refine it.
 */
export type MotionOptions = Omit<
  MotionNodeOptions,
  "custom" | "dragControls" | "layoutDependency"
> & {
  custom?: unknown;
  dragControls?: unknown;
  layoutDependency?: unknown;
};

export interface MotionState {
  /**
   * The underlying DOM element reference
   */
  element: MotionElement | null;

  /**
   * For all the different animation keys we store the corresponding MotionValue if they exist
   */
  values: MotionValues;

  /**
   * For all the different animation keys we store the latest goal value
   */
  goals: MotionGoals;

  /**
   * Latest resolved values from MotionValues (kept in sync via subscriptions)
   */
  resolvedValues: MotionGoals;

  /**
   * active state of gestures (hover, tap, focus, drag, inView)
   */
  activeGestures: MotionGesturesState;

  /**
   * current variant names being applied for each animation type
   */
  activeVariants: MotionVariantsState;

  /**
   * The props/options provided to the motion component
   */
  options: MotionOptions;

  /**
   * parent state for variant propagation
   */
  parent: MotionState | null;
}
