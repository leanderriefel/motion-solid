import type { ValueTransition, AnyResolvedKeyframe } from "motion-dom";

/**
 * Get the final keyframe from an array of keyframes.
 * Handles repeat modes like "reverse" where the final value might differ.
 */
export function getFinalKeyframe<V extends AnyResolvedKeyframe>(
  keyframes: V[],
  transition: ValueTransition,
): V | undefined {
  if (keyframes.length === 0) return undefined;

  const { repeat, repeatType = "loop" } = transition;

  // If there's an odd number of repeats with "reverse" type,
  // the animation ends at the first keyframe
  if (repeat !== undefined && repeatType === "reverse" && repeat % 2 === 1) {
    return keyframes[0];
  }

  // Otherwise return the last keyframe
  return keyframes[keyframes.length - 1];
}
