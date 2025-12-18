import type { ValueAnimationOptions, AnyResolvedKeyframe } from "motion-dom";

/**
 * Properties that should use spring animations by default.
 * These are typically transform properties where spring physics
 * produce more natural-feeling motion.
 */
const underDampedSpringProperties = new Set([
  "x",
  "y",
  "z",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "scale",
  "scaleX",
  "scaleY",
  "scaleZ",
  "skew",
  "skewX",
  "skewY",
]);

/**
 * Properties that should use critically damped springs.
 * These settle without oscillation for a smoother feel.
 */
const criticallyDampedSpringProperties = new Set([
  "opacity",
  "backgroundColor",
  "color",
  "fill",
  "stroke",
]);

/**
 * Get default transition settings for a property.
 * Returns spring animations for transform properties and
 * tween animations for others.
 */
export function getDefaultTransition<V extends AnyResolvedKeyframe>(
  name: string,
  _options: ValueAnimationOptions<V>,
): Partial<ValueAnimationOptions<V>> {
  if (underDampedSpringProperties.has(name)) {
    // Under-damped spring: bouncy, natural motion
    return {
      type: "spring",
      stiffness: 500,
      damping: 25,
      restSpeed: 10,
    } as Partial<ValueAnimationOptions<V>>;
  }

  if (criticallyDampedSpringProperties.has(name)) {
    // Critically damped spring: smooth without overshoot
    return {
      type: "spring",
      stiffness: 500,
      damping: 60,
      restSpeed: 10,
    } as Partial<ValueAnimationOptions<V>>;
  }

  // Default tween animation
  return {
    type: "tween",
    duration: 0.3,
    ease: "easeOut",
  } as Partial<ValueAnimationOptions<V>>;
}
