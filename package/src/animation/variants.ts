import type {
  AnyResolvedKeyframe,
  TargetAndTransition,
  Variant,
  VariantLabels,
  Variants,
} from "motion-dom";
import type { MotionOptions, MotionState, Transition } from "../types";
import { isRecord, isStringOrNumber } from "./types";

const hasFunction = (obj: Record<string, unknown>, key: string): boolean =>
  typeof obj[key] === "function";

const isLegacyAnimationControls = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return (
    hasFunction(value, "subscribe") &&
    hasFunction(value, "start") &&
    hasFunction(value, "stop")
  );
};

export const isVariantLabels = (value: unknown): value is VariantLabels =>
  typeof value === "string" ||
  (Array.isArray(value) && value.every((v) => typeof v === "string"));

export const isTargetAndTransition = (
  value: unknown,
): value is TargetAndTransition =>
  isRecord(value) && !isLegacyAnimationControls(value);

export const buildResolvedValues = (
  state: MotionState,
): Record<string, AnyResolvedKeyframe> => {
  const latest: Record<string, AnyResolvedKeyframe> = {};
  for (const [key, mv] of Object.entries(state.values)) {
    latest[key] = mv.get();
  }
  return latest;
};

export const buildResolvedVelocities = (
  state: MotionState,
): Record<string, AnyResolvedKeyframe> => {
  const v: Record<string, AnyResolvedKeyframe> = {};
  for (const [key, mv] of Object.entries(state.values)) {
    const vel = mv.getVelocity();
    v[key] = Number.isFinite(vel) ? vel : 0;
  }
  return v;
};

export const mergeTargets = (
  a: TargetAndTransition,
  b: TargetAndTransition,
): TargetAndTransition => {
  const next: TargetAndTransition = { ...a, ...b };

  if ("transition" in a && !("transition" in b)) next.transition = a.transition;
  if ("transition" in b) next.transition = b.transition;

  const aEnd = isRecord(a.transitionEnd)
    ? (a.transitionEnd as Record<string, unknown>)
    : null;
  const bEnd = isRecord(b.transitionEnd)
    ? (b.transitionEnd as Record<string, unknown>)
    : null;

  if (aEnd || bEnd) {
    const mergedEnd: Record<string, AnyResolvedKeyframe> = {};
    if (aEnd) {
      for (const [k, v] of Object.entries(aEnd)) {
        if (isStringOrNumber(v)) mergedEnd[k] = v;
      }
    }
    if (bEnd) {
      for (const [k, v] of Object.entries(bEnd)) {
        if (isStringOrNumber(v)) mergedEnd[k] = v;
      }
    }
    next.transitionEnd = mergedEnd;
  }

  return next;
};

export const resolveVariantToTarget = (args: {
  variant: Variant;
  options: MotionOptions;
  state: MotionState;
}): TargetAndTransition | null => {
  const { variant, options, state } = args;

  if (typeof variant === "function") {
    const current = buildResolvedValues(state);
    const velocity = buildResolvedVelocities(state);
    const resolved = variant(options.custom, current, velocity);
    if (typeof resolved === "string") return null;
    return resolved;
  }

  return variant;
};

export const resolveVariantLabelsToTarget = (args: {
  labels: VariantLabels;
  variants: Variants;
  options: MotionOptions;
  state: MotionState;
}): TargetAndTransition | null => {
  const { labels, variants, options, state } = args;
  const labelList = Array.isArray(labels) ? labels : [labels];

  let resolved: TargetAndTransition | null = null;
  for (const label of labelList) {
    const variant = variants[label];
    if (!variant) continue;
    const target = resolveVariantToTarget({ variant, options, state });
    if (!target) continue;
    resolved = resolved ? mergeTargets(resolved, target) : target;
  }

  return resolved;
};

/**
 * Get inherited variants from parent state, if inherit is not disabled.
 * Default behavior (inherit=true) is to inherit variants from parent.
 */
const getInheritedVariants = (
  options: MotionOptions,
  state: MotionState,
): Variants | null => {
  // If inherit is explicitly false, don't inherit from parent
  if (options.inherit === false) return null;

  // Walk up the parent chain to find variants
  let parent = state.parent;
  while (parent) {
    const parentVariants = parent.options.variants;
    if (parentVariants) {
      return parentVariants as Variants;
    }
    parent = parent.parent;
  }

  return null;
};

export const resolveDefinitionToTarget = (args: {
  definition: unknown;
  options: MotionOptions;
  state: MotionState;
}): TargetAndTransition | null => {
  const { definition, options, state } = args;

  if (!definition || definition === false) return null;
  if (isTargetAndTransition(definition)) return definition;

  if (isVariantLabels(definition)) {
    // First, try to resolve from local variants
    const localVariants = options.variants as Variants | undefined;
    if (localVariants) {
      const result = resolveVariantLabelsToTarget({
        labels: definition,
        variants: localVariants,
        options,
        state,
      });
      if (result) return result;
    }

    // If local variants didn't resolve, try inherited variants (unless inherit=false)
    const inheritedVariants = getInheritedVariants(options, state);
    if (inheritedVariants) {
      return resolveVariantLabelsToTarget({
        labels: definition,
        variants: inheritedVariants,
        options,
        state,
      });
    }

    return null;
  }

  return null;
};

export const isTransition = (value: unknown): value is Transition =>
  typeof value === "object" && value !== null;

export const getTransitionForKey = (
  base: Transition | undefined,
  key: string,
): Transition | undefined => {
  if (!base || !isTransition(base)) return base;

  const baseRec = base as Record<string, unknown>;
  const baseDelay =
    typeof baseRec.delay === "number" ? (baseRec.delay as number) : undefined;
  const baseElapsed =
    typeof baseRec.elapsed === "number"
      ? (baseRec.elapsed as number)
      : undefined;

  const applyInherited = (transition: Record<string, unknown>): Transition => {
    const needsDelay =
      baseDelay !== undefined && transition.delay === undefined;
    const needsElapsed =
      baseElapsed !== undefined && transition.elapsed === undefined;

    if (!needsDelay && !needsElapsed) return transition as Transition;

    return {
      ...(transition as Record<string, unknown>),
      ...(needsDelay ? { delay: baseDelay } : null),
      ...(needsElapsed ? { elapsed: baseElapsed } : null),
    } as Transition;
  };

  const specific = baseRec[key];
  if (isRecord(specific)) return applyInherited(specific);

  const fallback = baseRec.default;
  if (isRecord(fallback)) return applyInherited(fallback);

  return base;
};
