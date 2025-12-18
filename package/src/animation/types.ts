import type { MotionValue, TargetAndTransition } from "motion-dom";
import { motionValue } from "motion-dom";
import type { MotionValues } from "../types";

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
): MotionValue<string> | MotionValue<number> =>
  typeof init === "number" ? motionValue(init) : motionValue(init);

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
}): MotionValues => {
  const values: MotionValues = { ...(args.existingValues ?? {}) };

  for (const type of animationTypes) {
    const target = args.targetsByType[type];
    if (!target) continue;

    const keys = targetKeysFromTarget(target);
    for (const key of keys) {
      if (!values[key]) {
        const init = pickInitialFromKeyframes(
          (target as Record<string, unknown>)[key],
        );
        if (init === null) continue;
        values[key] = createMotionValueForKey(init);
      }
    }
  }

  return values;
};
