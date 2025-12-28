import type {
  AnyResolvedKeyframe,
  AnimationPlaybackControlsWithThen,
  MotionValue,
  Transition,
  ValueAnimationOptions,
  ValueTransition,
  UnresolvedKeyframes,
  StartAnimation,
} from "motion-dom";
import {
  AsyncMotionValueAnimation,
  JSAnimation,
  frame,
  getValueTransition,
  makeAnimationInstant,
} from "motion-dom";
import { MotionGlobalConfig, secondsToMilliseconds } from "motion-utils";
import { getFinalKeyframe } from "./get-final-keyframe";
import { getDefaultTransition } from "./default-transitions";
import { isTransitionDefined } from "./transition-utils";

/**
 * Animate a MotionValue to a target value or keyframes.
 *
 * This follows the framer-motion pattern: returns a curried function that
 * accepts an `onComplete` callback and returns animation controls.
 */
export const animateMotionValue = <V extends AnyResolvedKeyframe>(
  name: string,
  value: MotionValue<V>,
  target: V | UnresolvedKeyframes<V>,
  transition: ValueTransition & { elapsed?: number } = {},
): StartAnimation => {
  return (onComplete) => {
    const valueTransition = getValueTransition(transition, name) || {};

    // DEBUG: trace transition flow
    if (name === "translateX" || name === "scaleX") {
      console.log(`[animateMotionValue] name=${name}`);
      console.log(`  input transition:`, JSON.stringify(transition));
      console.log(`  valueTransition:`, JSON.stringify(valueTransition));
    }

    /**
     * Most transition values are currently completely overwritten by value-specific
     * transitions. In the future it'd be nicer to blend these transitions. But for now
     * delay actually does inherit from the root transition if not value-specific.
     */
    const delay = valueTransition.delay || transition.delay || 0;

    /**
     * Elapsed isn't a public transition option but can be passed through from
     * optimized appear effects in milliseconds.
     */
    let { elapsed = 0 } = transition;
    elapsed = elapsed - secondsToMilliseconds(delay);

    const current = value.get();

    // Build keyframes.
    // For simple target values we animate from the current MotionValue.
    // (Using `null` as a wildcard breaks in motion-dom if it can't be resolved.)
    const keyframes: V[] = Array.isArray(target)
      ? ((target as Array<V | null | undefined>).map((kf) =>
          kf == null ? current : kf,
        ) as V[])
      : ([current, target] as V[]);

    // If a single keyframe is provided, animate from current to it.
    if (keyframes.length === 1) keyframes.unshift(current);

    const options: ValueAnimationOptions<V> & Record<string, unknown> = {
      keyframes,
      ease: "easeOut",
      velocity: value.getVelocity(),
      ...valueTransition,
      delay: -elapsed,
      onUpdate: (v: V) => {
        value.set(v);
        valueTransition.onUpdate && valueTransition.onUpdate(v);
      },
      onComplete: () => {
        onComplete();
        valueTransition.onComplete && valueTransition.onComplete();
      },
      name,
      motionValue: value,
    };

    /**
     * If there's no transition defined for this value, we can generate
     * unique transition settings for this value.
     */
    if (!isTransitionDefined(valueTransition)) {
      Object.assign(options, getDefaultTransition(name, options));
    }

    // DEBUG: after defaults applied
    if (name === "translateX" || name === "scaleX") {
      console.log(
        `  isTransitionDefined:`,
        isTransitionDefined(valueTransition),
      );
      console.log(
        `  options after defaults:`,
        JSON.stringify({
          type: options.type,
          duration: options.duration,
          stiffness: options.stiffness,
          damping: options.damping,
          ease: options.ease,
        }),
      );
    }

    /**
     * Both WAAPI and our internal animation functions use durations
     * as defined by milliseconds, while our external API defines them
     * as seconds.
     */
    if (options.duration !== undefined) {
      options.duration = secondsToMilliseconds(options.duration);
    }
    if (options.repeatDelay !== undefined) {
      options.repeatDelay = secondsToMilliseconds(options.repeatDelay);
    }

    // DEBUG: final options
    if (name === "translateX" || name === "scaleX") {
      console.log(
        `  final options:`,
        JSON.stringify({
          type: options.type,
          duration: options.duration,
          stiffness: options.stiffness,
          damping: options.damping,
        }),
      );
    }

    /**
     * Support deprecated way to set initial value. Prefer keyframe syntax.
     */
    if (options.from !== undefined) {
      options.keyframes[0] = options.from as V;
    }

    let shouldSkip = false;

    if (
      options.type === false ||
      (options.duration === 0 && !options.repeatDelay)
    ) {
      makeAnimationInstant(options);

      if (options.delay === 0) {
        shouldSkip = true;
      }
    }

    if (
      MotionGlobalConfig.instantAnimations ||
      MotionGlobalConfig.skipAnimations
    ) {
      shouldSkip = true;
      makeAnimationInstant(options);
      options.delay = 0;
    }

    /**
     * If the transition type or easing has been explicitly set by the user
     * then we don't want to allow flattening the animation.
     */
    options.allowFlatten = !valueTransition.type && !valueTransition.ease;

    /**
     * If we can or must skip creating the animation, and apply only
     * the final keyframe, do so. We also check once keyframes are resolved but
     * this early check prevents the need to create an animation at all.
     */
    if (shouldSkip && value.get() !== undefined) {
      const finalKeyframe = getFinalKeyframe<V>(
        options.keyframes as V[],
        valueTransition,
      );

      if (finalKeyframe !== undefined) {
        frame.update(() => {
          options.onUpdate!(finalKeyframe);
          options.onComplete!();
        });

        return;
      }
    }

    /**
     * Use synchronous JSAnimation when explicitly requested, otherwise
     * use AsyncMotionValueAnimation for better performance.
     */
    return options.isSync
      ? new JSAnimation(options as unknown as ValueAnimationOptions<V>)
      : new AsyncMotionValueAnimation(
          options as unknown as ValueAnimationOptions<V>,
        );
  };
};

/**
 * Legacy API - starts a motion value animation directly.
 * Prefer using `animateMotionValue` for the curried pattern.
 */
export const startMotionValueAnimation = <V extends AnyResolvedKeyframe>(args: {
  name: string;
  motionValue: MotionValue<V>;
  keyframes: unknown;
  transition?: Transition;
}): AnimationPlaybackControlsWithThen | undefined => {
  const { name, motionValue, keyframes, transition } = args;
  const current = motionValue.get();

  const isMatchingKeyframe = (value: unknown): value is V => {
    if (typeof value !== "string" && typeof value !== "number") return false;
    return typeof value === typeof current;
  };

  const resolvedTarget: V | V[] | null = Array.isArray(keyframes)
    ? (keyframes.filter(isMatchingKeyframe) as V[])
    : isMatchingKeyframe(keyframes)
      ? (keyframes as V)
      : null;

  if (resolvedTarget === null) return undefined;
  if (Array.isArray(resolvedTarget) && resolvedTarget.length === 0)
    return undefined;

  const targetToAnimate: V | V[] =
    Array.isArray(resolvedTarget) && resolvedTarget.length === 1
      ? resolvedTarget[0]!
      : resolvedTarget;

  let controls: AnimationPlaybackControlsWithThen | undefined;

  void motionValue.start((complete) => {
    const startAnimation = animateMotionValue(
      name,
      motionValue,
      targetToAnimate,
      transition as ValueTransition,
    );

    const animation = startAnimation(complete);

    if (animation) {
      controls = animation as AnimationPlaybackControlsWithThen;
    }

    return animation;
  });

  return controls;
};
