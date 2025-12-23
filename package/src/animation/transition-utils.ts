import type { Transition, ValueTransition } from "motion-dom";

/**
 * Check if a transition has any animation-defining properties set.
 * If not, we can apply smart default transitions based on the property name.
 */
export function isTransitionDefined(transition: ValueTransition): boolean {
  return (
    transition.type !== undefined ||
    transition.ease !== undefined ||
    transition.duration !== undefined ||
    transition.stiffness !== undefined ||
    transition.damping !== undefined ||
    transition.mass !== undefined ||
    transition.velocity !== undefined ||
    transition.bounce !== undefined ||
    transition.restSpeed !== undefined ||
    transition.restDelta !== undefined ||
    transition.visualDuration !== undefined
  );
}

/**
 * Get the transition settings for a specific animation key.
 *
 * Follows Framer Motion semantics:
 * 1. `transition[key]` - value-specific transition (e.g. `transition.opacity`)
 * 2. `transition.default` - default transition for all values
 * 3. Root transition object - the transition itself
 *
 * Delay is inherited from root if not specified in the resolved transition.
 *
 * @param transition - The transition object from props
 * @param key - The animation key (e.g. "opacity", "x", "layout")
 * @param fallback - Optional fallback transition if none is defined
 * @returns The resolved ValueTransition for this key
 */
export function getTransitionForKey(
  transition: Transition | undefined,
  key: string,
  fallback?: ValueTransition,
): ValueTransition | undefined {
  if (!transition) return fallback;

  if (typeof transition !== "object" || transition === null) {
    return fallback;
  }

  const root = transition as ValueTransition & Record<string, unknown>;
  const rootDelay = root.delay as number | undefined;

  // Check for key-specific transition (e.g. transition.opacity, transition.layout)
  const keyOverride = root[key];

  // Check for default transition
  const defaultOverride = root.default;

  // Determine which candidate to use: key-specific > default > root
  let candidate: unknown;
  if (keyOverride !== undefined) {
    candidate = keyOverride;
  } else if (defaultOverride !== undefined) {
    candidate = defaultOverride;
  } else {
    candidate = root;
  }

  // Validate candidate is an object we can use as a transition
  const candidateTransition: ValueTransition | null =
    candidate && typeof candidate === "object"
      ? (candidate as ValueTransition)
      : null;

  // Determine delay to inherit (from candidate, then root)
  const delayToInherit = (candidateTransition?.delay ?? rootDelay) as
    | number
    | undefined;

  // Check if candidate defines an actual animation
  const resolved =
    candidateTransition && isTransitionDefined(candidateTransition)
      ? candidateTransition
      : fallback;

  if (!resolved) return undefined;

  // Inherit delay if not already set
  if (delayToInherit !== undefined && resolved.delay === undefined) {
    return { ...resolved, delay: delayToInherit };
  }

  return resolved;
}
