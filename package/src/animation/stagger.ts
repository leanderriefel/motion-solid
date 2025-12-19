export interface StaggerOptions {
  /**
   * Start stagger from first, last, center, or specific index
   * @default "first"
   */
  from?: "first" | "last" | "center" | number;
  /**
   * Easing function for stagger distribution
   */
  ease?: (t: number) => number;
}

export interface StaggerFunction {
  (index: number, total: number): number;
  __isStagger: true;
}

/**
 * Creates a stagger function for delaying children animations.
 *
 * When used with `delayChildren` in a variant's transition, this will
 * stagger the animation of child elements.
 *
 * @param interval - Base delay interval in seconds between each child
 * @param options - Stagger configuration
 *
 * @example
 * ```tsx
 * const container = {
 *   hidden: { opacity: 0 },
 *   show: {
 *     opacity: 1,
 *     transition: {
 *       delayChildren: stagger(0.1), // Stagger children by 0.1 seconds
 *     },
 *   },
 * };
 *
 * // Stagger from the last child
 * stagger(0.1, { from: "last" })
 *
 * // Stagger from the center
 * stagger(0.1, { from: "center" })
 *
 * // Stagger from a specific index
 * stagger(0.1, { from: 2 })
 * ```
 */
export const stagger = (
  interval: number,
  options: StaggerOptions = {},
): StaggerFunction => {
  const { from = "first", ease } = options;

  const fn = (index: number, total: number): number => {
    let staggerIndex: number;

    if (from === "first") {
      staggerIndex = index;
    } else if (from === "last") {
      staggerIndex = total - 1 - index;
    } else if (from === "center") {
      const center = (total - 1) / 2;
      staggerIndex = Math.abs(index - center);
    } else if (typeof from === "number") {
      staggerIndex = Math.abs(index - from);
    } else {
      staggerIndex = index;
    }

    let delay = staggerIndex * interval;

    if (ease && total > 1) {
      const progress = staggerIndex / (total - 1);
      delay = ease(progress) * interval * (total - 1);
    }

    return delay;
  };

  (fn as StaggerFunction).__isStagger = true;
  return fn as StaggerFunction;
};

/**
 * Check if a value is a stagger function
 */
export const isStaggerFunction = (value: unknown): value is StaggerFunction => {
  return (
    typeof value === "function" &&
    (value as StaggerFunction).__isStagger === true
  );
};
