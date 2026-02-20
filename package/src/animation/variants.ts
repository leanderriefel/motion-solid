import type { AnyResolvedKeyframe, VariantLabels } from "motion-dom";
import type {
  MotionOptions,
  MotionState,
  MotionTargetAndTransition,
  Transition,
  Variant,
  Variants,
} from "../types";
import { isRecord, isStringOrNumber } from "./types";
import { normalizeTransformKey } from "./render";

const hasFunction = (obj: Record<string, unknown>, key: string): boolean =>
  typeof obj[key] === "function";

const normalizeKeyedObject = (
  source: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key in source) {
    const normalizedKey = normalizeTransformKey(key);
    if (normalizedKey in result && key !== normalizedKey) continue;
    result[normalizedKey] = source[key];
  }
  return result;
};

const normalizeTarget = (
  target: MotionTargetAndTransition,
): MotionTargetAndTransition => {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(target)) {
    if (key === "transition" || key === "transitionEnd") continue;
    const normalizedKey = normalizeTransformKey(key);
    if (normalizedKey in normalized && key !== normalizedKey) continue;
    normalized[normalizedKey] = value;
  }

  const transition = isRecord(target.transition)
    ? normalizeKeyedObject(target.transition as Record<string, unknown>)
    : target.transition;

  const transitionEnd = isRecord(target.transitionEnd)
    ? normalizeKeyedObject(target.transitionEnd as Record<string, unknown>)
    : target.transitionEnd;

  if (transition !== undefined) normalized.transition = transition;
  if (transitionEnd !== undefined) normalized.transitionEnd = transitionEnd;

  return normalized as MotionTargetAndTransition;
};

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
): value is MotionTargetAndTransition =>
  isRecord(value) && !Array.isArray(value) && !isLegacyAnimationControls(value);

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
  a: MotionTargetAndTransition,
  b: MotionTargetAndTransition,
): MotionTargetAndTransition => {
  const next: MotionTargetAndTransition = { ...a, ...b };

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
}): MotionTargetAndTransition | null => {
  const { variant, options, state } = args;

  const seenLabels = new Set<string>();

  const resolveLabel = (label: string): MotionTargetAndTransition | null => {
    let nextLabel = label;

    while (true) {
      if (seenLabels.has(nextLabel)) return null;
      seenLabels.add(nextLabel);

      const localVariants = options.variants as Variants | undefined;
      if (!localVariants) return null;

      const resolvedVariant = localVariants[nextLabel];
      if (!resolvedVariant) return null;

      if (typeof resolvedVariant === "function") {
        const current = buildResolvedValues(state);
        const velocity = buildResolvedVelocities(state);
        const resolved = resolvedVariant(options.custom, current, velocity);

        if (typeof resolved === "string") {
          nextLabel = resolved;
          continue;
        }

        return normalizeTarget(resolved);
      }

      return normalizeTarget(resolvedVariant);
    }
  };

  if (typeof variant === "function") {
    const current = buildResolvedValues(state);
    const velocity = buildResolvedVelocities(state);
    const resolved = variant(options.custom, current, velocity);

    if (typeof resolved === "string") {
      return resolveLabel(resolved);
    }

    return normalizeTarget(resolved);
  }

  return normalizeTarget(variant);
};

export const resolveVariantLabelsToTarget = (args: {
  labels: VariantLabels;
  variants: Variants;
  options: MotionOptions;
  state: MotionState;
}): MotionTargetAndTransition | null => {
  const { labels, variants, options, state } = args;
  const labelList = Array.isArray(labels) ? labels : [labels];

  let resolved: MotionTargetAndTransition | null = null;
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
}): MotionTargetAndTransition | null => {
  const { definition, options, state } = args;

  if (!definition || definition === false) return null;
  if (isTargetAndTransition(definition)) return normalizeTarget(definition);

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
