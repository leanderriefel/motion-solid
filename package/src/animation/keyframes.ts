import type { AnyResolvedKeyframe, MotionValue, Transition } from "motion-dom";
import { isRecord, isStringOrNumber } from "./types";

export const pickInitialFromKeyframes = (
  keyframes: unknown,
): AnyResolvedKeyframe | null => {
  if (Array.isArray(keyframes)) {
    for (const v of keyframes) {
      if (isStringOrNumber(v)) return v;
    }
    return null;
  }

  return isStringOrNumber(keyframes) ? keyframes : null;
};

export const pickFinalFromKeyframes = (
  keyframes: unknown,
): AnyResolvedKeyframe | null => {
  if (Array.isArray(keyframes)) {
    for (let i = keyframes.length - 1; i >= 0; i -= 1) {
      const v = keyframes[i];
      if (isStringOrNumber(v)) return v;
    }
    return null;
  }

  return isStringOrNumber(keyframes) ? keyframes : null;
};

export const areKeyframesEqual = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return a === b;
};

export const resolveMotionValueKeyframes = (args: {
  motionValue: MotionValue<string | number>;
  keyframes: unknown;
  transition?: Transition;
}): AnyResolvedKeyframe[] | null => {
  const { motionValue, keyframes, transition } = args;
  const from =
    isRecord(transition) && isStringOrNumber(transition.from)
      ? transition.from
      : undefined;

  if (Array.isArray(keyframes)) {
    const resolved = keyframes.filter(
      isStringOrNumber,
    ) as AnyResolvedKeyframe[];
    if (resolved.length === 0) return null;
    if (from !== undefined && resolved[0] !== from) return [from, ...resolved];
    return resolved;
  }

  if (!isStringOrNumber(keyframes)) return null;

  const origin = from ?? motionValue.get();
  if (origin === keyframes) return [keyframes];
  return [origin, keyframes];
};
