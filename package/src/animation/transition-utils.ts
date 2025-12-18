import type { ValueTransition } from "motion-dom";

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
