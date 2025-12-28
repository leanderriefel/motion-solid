import type { MotionValue, TargetAndTransition } from "motion-dom";
import { motionValue, defaultTransformValue } from "motion-dom";
import { isTransformProp, toMotionDomTransformKey } from "./render";
import type { MotionValues } from "../types";

type MotionValueOwner = NonNullable<MotionValue<unknown>["owner"]>;

export const animationTypes = [
  "exit",
  "whileDrag",
  "whileTap",
  "whileHover",
  "whileFocus",
  "whileInView",
  "animate",
] as const;

export type AnimationType = (typeof animationTypes)[number];

export type AnimationTypeTargets = Partial<
  Record<AnimationType, TargetAndTransition>
>;

export type AnimationTypeValuesMap = Record<AnimationType, MotionValues>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isStringOrNumber = (value: unknown): value is string | number =>
  typeof value === "string" || typeof value === "number";

const pickInitialFromKeyframes = (
  keyframes: unknown,
): string | number | null => {
  if (Array.isArray(keyframes)) {
    for (const v of keyframes) {
      if (isStringOrNumber(v)) return v;
    }
    return null;
  }

  return isStringOrNumber(keyframes) ? keyframes : null;
};

const targetKeysFromTarget = (target: TargetAndTransition): string[] => {
  const keys: string[] = [];
  for (const key of Object.keys(target)) {
    if (key === "transition" || key === "transitionEnd") continue;
    keys.push(key);
  }
  return keys;
};

const createMotionValueForKey = (
  init: string | number,
  owner?: MotionValueOwner,
): MotionValue<string> | MotionValue<number> =>
  (() => {
    const mv = typeof init === "number" ? motionValue(init) : motionValue(init);
    if (owner) mv.owner = owner;
    return mv;
  })();

/**
 * Default CSS property values for properties that have well-known defaults.
 * These are used when no `initial` prop is provided and we need to determine
 * the starting value for an animation.
 */
const cssDefaultValues: Record<string, string | number> = {
  opacity: 1,
  "fill-opacity": 1,
  "stroke-opacity": 1,
  // Filter functions default to their identity values
  blur: 0,
  brightness: 1,
  contrast: 1,
  grayscale: 0,
  saturate: 1,
  sepia: 0,
  invert: 0,
  "hue-rotate": 0,
  // SVG properties
  "path-length": 0,
  "path-offset": 0,
  "stroke-dashoffset": 0,
};

/**
 * Get the default initial value for a CSS property.
 * Returns undefined if no known default exists.
 */
const getDefaultCSSValue = (key: string): string | number | undefined => {
  return cssDefaultValues[key];
};

/**
 * Given already-resolved per-animation-type targets, ensure `MotionValue`s exist
 * for all referenced keys and return a map for each animation type that points
 * at the shared `values` map.
 *
 * This is intentionally a pure builder: it doesn't start animations. That work
 * happens in a reactive hook.
 */
export const buildAnimationTypeMotionValues = (args: {
  targetsByType: AnimationTypeTargets;
  existingValues?: MotionValues;
  owner?: MotionValueOwner;
}): MotionValues => {
  const values: MotionValues = { ...args.existingValues };

  for (const type of animationTypes) {
    const target = args.targetsByType[type];
    if (!target) continue;

    const keys = targetKeysFromTarget(target);
    for (const key of keys) {
      if (!values[key]) {
        // For transform properties, use the default transform value (0 for most, 1 for scale)
        // rather than the target value. This ensures animations start from the correct
        // initial state when no explicit `initial` prop is provided.
        if (isTransformProp(key)) {
          const motionDomKey = toMotionDomTransformKey(key);
          const defaultValue = defaultTransformValue(motionDomKey);
          values[key] = createMotionValueForKey(defaultValue, args.owner);
          continue;
        }

        // For CSS properties with known defaults (like opacity: 1), use those defaults
        const cssDefault = getDefaultCSSValue(key);
        if (cssDefault !== undefined) {
          values[key] = createMotionValueForKey(cssDefault, args.owner);
          continue;
        }

        // For other properties, use the first keyframe value as before
        // (this is a fallback and may not always be correct, but matches legacy behavior)
        const init = pickInitialFromKeyframes(
          (target as Record<string, unknown>)[key],
        );
        if (init === null) continue;
        values[key] = createMotionValueForKey(init, args.owner);
      }
    }
  }

  return values;
};
