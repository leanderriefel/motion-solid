import {
  createEffect,
  createMemo,
  createRenderEffect,
  createUniqueId,
  onCleanup,
  untrack,
} from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type {
  AnyResolvedKeyframe,
  AnimationPlaybackControlsWithThen,
  MotionValue,
  Transition,
} from "motion-dom";
import {
  motionValue,
  transformProps,
  defaultTransformValue,
  readTransformValue,
} from "motion-dom";
import type { MotionOptions, MotionState, MotionValues } from "../types";
import {
  animationTypes,
  type AnimationType,
  type AnimationTypeTargets,
  buildAnimationTypeMotionValues,
  isStringOrNumber,
} from "./types";
import {
  pickInitialFromKeyframes,
  pickFinalFromKeyframes,
  areKeyframesEqual,
} from "./keyframes";
import { startMotionValueAnimation } from "./motion-value";
import { buildHTMLStyles, createRenderState } from "./render";
import { resolveDefinitionToTarget, getTransitionForKey } from "./variants";
import type { PresenceContextValue } from "../component/presence";
import { createLayoutNode, layoutManager } from "../layout/layout-manager";

type TransformTemplate = (
  transform: Record<string, string | number>,
  generatedTransform: string,
) => string;

export interface AnimationStateOptions {
  state: MotionState;
  setState: SetStoreFunction<MotionState>;
  options: MotionOptions;
  presence: PresenceContextValue | null;
}

export const useAnimationState = (args: AnimationStateOptions): void => {
  const { state, setState, options, presence } = args;

  const latestValues = new Map<string, AnyResolvedKeyframe>();
  const renderState = createRenderState();
  const prevStyle = new Map<string, string>();
  const prevVars = new Map<string, string>();
  let frameId: number | null = null;

  const presenceId = presence ? createUniqueId() : null;

  createEffect(() => {
    if (!presence || !presenceId) return;
    const unregister = presence.register(presenceId);
    onCleanup(unregister);
  });

  let projectionTransform: string | null = null;
  let projectionOpacity: number | null = null;
  let prevProjectionOpacity: number | null = null;

  let wasProjectionTransformActive = false;
  let restoreInlineTransform: string | null = null;
  let projectionBaseTransform: string | null = null;

  let layoutNode: ReturnType<typeof createLayoutNode> | null = null;

  const renderToDom = () => {
    const element = state.element;
    if (!element) return;

    // Reset render state for fresh computation
    renderState.style = {};
    renderState.vars = {};
    renderState.transform = {};
    renderState.transformOrigin = {};

    // Convert Map to plain object for buildHTMLStyles
    const values: Record<string, string | number> = {};
    for (const [key, v] of latestValues.entries()) {
      if (isStringOrNumber(v)) values[key] = v;
    }

    buildHTMLStyles(
      renderState,
      values,
      options.transformTemplate as TransformTemplate | undefined,
    );

    const hasMotionTransform = renderState.style.transform !== undefined;

    if (projectionTransform !== null) {
      if (!wasProjectionTransformActive) {
        restoreInlineTransform = element.style.transform;
        // Snapshot the element's base transform before applying projection.
        // We must not read computed transforms on subsequent frames because the computed
        // value would include the projection transform we apply inline, causing compounding.
        if (typeof getComputedStyle === "function") {
          const computed = getComputedStyle(element).transform;
          projectionBaseTransform = computed === "none" ? "" : computed;
        } else {
          projectionBaseTransform = restoreInlineTransform ?? "";
        }
        wasProjectionTransformActive = true;
      }

      let baseTransform = renderState.style.transform;

      // If Motion isn't generating a transform, fall back to the snapshotted base transform.
      // Never read computed styles here (see comment above).
      if (baseTransform === undefined)
        baseTransform = projectionBaseTransform ?? "";

      const combinedTransform =
        baseTransform === "" || baseTransform === "none"
          ? projectionTransform
          : `${projectionTransform} ${baseTransform}`;

      renderState.style.transform = combinedTransform;
    } else if (wasProjectionTransformActive) {
      if (!hasMotionTransform) {
        renderState.style.transform = restoreInlineTransform ?? "";
      }

      restoreInlineTransform = null;
      projectionBaseTransform = null;
      wasProjectionTransformActive = false;
    }

    if (projectionOpacity !== null) {
      const baseOpacity = renderState.style.opacity;
      if (baseOpacity === undefined) {
        renderState.style.opacity = String(projectionOpacity);
      } else {
        const parsed = parseFloat(baseOpacity);
        renderState.style.opacity = Number.isNaN(parsed)
          ? baseOpacity
          : String(parsed * projectionOpacity);
      }
    } else if (
      prevProjectionOpacity !== null &&
      renderState.style.opacity === undefined
    ) {
      renderState.style.opacity = "";
    }

    prevProjectionOpacity = projectionOpacity;

    // Apply styles (use direct property assignment for camelCase keys)
    for (const key in renderState.style) {
      const value = renderState.style[key];
      if (value === undefined) continue;
      if (prevStyle.get(key) === value) continue;
      (element.style as unknown as Record<string, string>)[key] = value;
      prevStyle.set(key, value);
    }

    // Apply CSS variables
    for (const key in renderState.vars) {
      const rawValue = renderState.vars[key];
      if (rawValue === undefined) continue;
      const value = String(rawValue);
      if (prevVars.get(key) === value) continue;
      element.style.setProperty(key, value);
      prevVars.set(key, value);
    }

    if (typeof options.onUpdate === "function") {
      options.onUpdate(values);
    }
  };

  const scheduleRender = () => {
    if (typeof requestAnimationFrame === "undefined") return;
    if (frameId !== null) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      renderToDom();
    });
  };

  onCleanup(() => {
    if (frameId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(frameId);
    }
  });

  createEffect(() => {
    if (state.element) scheduleRender();
  });

  const applyProjection = (
    update: { transform?: string | null; opacity?: number | null },
    immediate: boolean,
  ) => {
    if ("transform" in update) projectionTransform = update.transform ?? null;
    if ("opacity" in update) projectionOpacity = update.opacity ?? null;

    if (immediate) {
      renderToDom();
    } else {
      scheduleRender();
    }
  };

  const layoutEnabled = createMemo(
    () => Boolean(options.layout) || Boolean(options.layoutId),
  );

  const getLayoutNodeOptions = () => ({
    layout: options.layout,
    layoutId: options.layoutId,
    layoutCrossfade: options.layoutCrossfade,
    transition: options.transition as Transition | undefined,
    onBeforeLayoutMeasure: options.onBeforeLayoutMeasure,
    onLayoutMeasure: options.onLayoutMeasure,
    onLayoutAnimationStart: options.onLayoutAnimationStart,
    onLayoutAnimationComplete: options.onLayoutAnimationComplete,
  });

  createRenderEffect(() => {
    const element = state.element;
    if (!element || !layoutEnabled()) return;

    const node = createLayoutNode({
      element,
      options: untrack(getLayoutNodeOptions),
      apply: applyProjection,
      render: renderToDom,
      scheduleRender,
    });

    layoutNode = node;
    layoutManager.register(node);

    onCleanup(() => {
      layoutManager.unregister(node);
      if (layoutNode === node) layoutNode = null;
    });
  });

  createEffect(() => {
    const enabled = layoutEnabled();
    const nextOptions = getLayoutNodeOptions();
    const node = layoutNode;

    if (!enabled || !node) return;

    layoutManager.updateNodeOptions(node, nextOptions);
    layoutManager.scheduleUpdate();
  });

  createRenderEffect(() => {
    const enabled = layoutEnabled();
    void options.layoutDependency;

    if (!enabled) return;

    layoutManager.scheduleUpdate();
  });

  const running = new Map<
    string,
    { type: AnimationType; controls: AnimationPlaybackControlsWithThen }
  >();
  const prevKeyframes = new Map<string, unknown>();
  const prevType = new Map<string, AnimationType>();

  const baseValueCache = new Map<string, string | number>();
  let baseValueCacheElement: HTMLElement | null = null;

  const stopKey = (key: string) => {
    const existing = running.get(key);
    if (existing?.controls) existing.controls.stop();
    running.delete(key);
  };

  const stopAll = () => {
    for (const key of Array.from(running.keys())) stopKey(key);
  };

  onCleanup(() => {
    stopAll();
  });

  let didApplyInitial = false;

  let exitCycleId = 0;
  let wasExiting = false;
  let scheduledExitCycleId: number | null = null;

  createEffect(() => {
    if (didApplyInitial) return;

    const target = resolveDefinitionToTarget({
      definition: options.initial,
      options,
      state,
    });

    if (!target) {
      didApplyInitial = true;
      return;
    }

    const targetRecord = target as Record<string, unknown>;
    for (const [key, keyframes] of Object.entries(targetRecord)) {
      if (key === "transition" || key === "transitionEnd") continue;

      const initial = pickInitialFromKeyframes(keyframes);
      if (initial === null) continue;

      const existing = state.values[key];

      if (existing) {
        if (typeof initial === "number") {
          (existing as MotionValue<number>).set(initial);
        } else {
          (existing as MotionValue<string>).set(initial);
        }
      } else {
        const mv =
          typeof initial === "number"
            ? motionValue(initial)
            : motionValue(initial);
        setState("values", key, mv);
      }
    }

    didApplyInitial = true;
  });

  createEffect(() => {
    const unsubscribes: VoidFunction[] = [];

    for (const [key, mv] of Object.entries(state.values)) {
      const latest = mv.get();
      latestValues.set(key, latest);
      setState("resolvedValues", key, latest);

      const unsubscribe = mv.on("change", (next) => {
        latestValues.set(key, next as AnyResolvedKeyframe);
        setState("resolvedValues", key, next as AnyResolvedKeyframe);
        scheduleRender();
      });

      unsubscribes.push(unsubscribe);
    }

    scheduleRender();

    onCleanup(() => {
      for (const unsub of unsubscribes) unsub();
    });
  });

  createEffect(() => {
    // Explicitly read all reactive dependencies to ensure tracking
    const activeGestures = {
      hover: state.activeGestures.hover,
      tap: state.activeGestures.tap,
      focus: state.activeGestures.focus,
      drag: state.activeGestures.drag,
      inView: state.activeGestures.inView,
    };
    const isPresent = presence?.isPresent() ?? true;
    const isExiting = presence ? !isPresent : false;

    if (!wasExiting && isExiting) {
      const node = layoutNode;
      if (node?.options.layoutId) {
        layoutManager.relegate(node);
      }
    }

    if (wasExiting && !isExiting) {
      exitCycleId++;
      scheduledExitCycleId = null;
    }
    wasExiting = isExiting;

    const definitions: Record<AnimationType, unknown> = {
      exit: options.exit,
      whileDrag: options.whileDrag,
      whileTap: options.whileTap,
      whileHover: options.whileHover,
      whileFocus: options.whileFocus,
      whileInView: options.whileInView,
      animate: options.animate,
    };

    const resolvedTargetsByType: AnimationTypeTargets = {};
    for (const type of animationTypes) {
      const target = resolveDefinitionToTarget({
        definition: definitions[type],
        options,
        state,
      });
      if (target) resolvedTargetsByType[type] = target;
    }

    const initialTarget = resolveDefinitionToTarget({
      definition: options.initial,
      options,
      state,
    });

    const resolvedAnimate = resolvedTargetsByType.animate as
      | Record<string, unknown>
      | undefined;
    const resolvedInitial =
      (initialTarget as Record<string, unknown> | null) ?? null;

    const allKeys = new Set<string>();
    const collectKeys = (target: unknown) => {
      if (!target || typeof target !== "object") return;
      for (const key of Object.keys(target as Record<string, unknown>)) {
        if (key === "transition" || key === "transitionEnd") continue;
        allKeys.add(key);
      }
    };

    for (const t of Object.values(resolvedTargetsByType)) collectKeys(t);
    collectKeys(initialTarget);

    const expectedTypeForKey = (key: string): "number" | "string" | null => {
      const candidates: Array<Record<string, unknown> | null | undefined> = [
        resolvedAnimate,
        resolvedInitial,
        resolvedTargetsByType.whileHover as Record<string, unknown> | undefined,
        resolvedTargetsByType.whileTap as Record<string, unknown> | undefined,
        resolvedTargetsByType.whileFocus as Record<string, unknown> | undefined,
        resolvedTargetsByType.whileInView as
          | Record<string, unknown>
          | undefined,
        resolvedTargetsByType.whileDrag as Record<string, unknown> | undefined,
        resolvedTargetsByType.exit as Record<string, unknown> | undefined,
      ];

      for (const target of candidates) {
        if (!target) continue;
        const initial = pickInitialFromKeyframes(target[key]);
        if (initial === null) continue;
        return typeof initial === "number" ? "number" : "string";
      }

      return null;
    };

    // Build a base target for the `animate` type, so gesture animations can
    // animate back to a rest state even when `animate` isn't provided.
    const baseAnimate: Record<string, unknown> = {};
    const element = state.element as HTMLElement | null;

    if (element !== baseValueCacheElement) {
      baseValueCache.clear();
      baseValueCacheElement = element;
    }

    for (const key of allKeys) {
      if (resolvedAnimate && key in resolvedAnimate) {
        baseAnimate[key] = resolvedAnimate[key];
        continue;
      }

      if (resolvedInitial && key in resolvedInitial) {
        baseAnimate[key] = resolvedInitial[key];
        continue;
      }

      const cached = baseValueCache.get(key);
      if (cached !== undefined) {
        baseAnimate[key] = cached;
        continue;
      }

      if (transformProps.has(key)) {
        const value = element
          ? readTransformValue(element, key)
          : defaultTransformValue(key);
        baseValueCache.set(key, value);
        baseAnimate[key] = value;
        continue;
      }

      if (element && typeof getComputedStyle === "function") {
        const computed = getComputedStyle(element);
        const raw = (computed as unknown as Record<string, string>)[key];
        if (raw === undefined) continue;

        const expected = expectedTypeForKey(key);
        let value: string | number = raw;

        if (expected === "number") {
          const parsed = parseFloat(raw);
          value = Number.isNaN(parsed) ? raw : parsed;
        }

        baseValueCache.set(key, value);
        baseAnimate[key] = value;
      }
    }

    if (resolvedAnimate) {
      if ("transition" in resolvedAnimate)
        baseAnimate.transition = resolvedAnimate.transition;
      if ("transitionEnd" in resolvedAnimate)
        baseAnimate.transitionEnd = resolvedAnimate.transitionEnd;
    }

    // Always keep an `animate` target active as the base layer.
    resolvedTargetsByType.animate =
      baseAnimate as unknown as typeof resolvedTargetsByType.animate;

    const nextValues = buildAnimationTypeMotionValues({
      targetsByType: { animate: baseAnimate as any },
      existingValues: state.values,
    });

    // Keep the store in sync with any newly created MotionValues without
    // replacing the whole map (avoids infinite loops in this effect).
    for (const [key, mv] of Object.entries(nextValues)) {
      if (!state.values[key]) setState("values", key, mv);
    }

    const activeTargetsByType: AnimationTypeTargets = {};
    for (const type of animationTypes) {
      let isActive = false;
      switch (type) {
        case "exit":
          isActive = isExiting;
          break;
        case "whileDrag":
          isActive = activeGestures.drag;
          break;
        case "whileTap":
          isActive = activeGestures.tap;
          break;
        case "whileHover":
          isActive = activeGestures.hover;
          break;
        case "whileFocus":
          isActive = activeGestures.focus;
          break;
        case "whileInView":
          isActive = activeGestures.inView;
          break;
        case "animate":
          isActive = true;
          break;
      }
      if (!isActive) continue;
      const t = resolvedTargetsByType[type];
      if (t) activeTargetsByType[type] = t;
    }

    const nextActiveKeyToType = new Map<string, AnimationType>();
    const nextActiveKeyToKeyframes = new Map<string, unknown>();

    for (const type of animationTypes) {
      const target = activeTargetsByType[type];
      if (!target) continue;

      const targetRecord = target as Record<string, unknown>;
      for (const [key, keyframes] of Object.entries(targetRecord)) {
        if (key === "transition" || key === "transitionEnd") continue;
        if (!nextActiveKeyToType.has(key)) {
          nextActiveKeyToType.set(key, type);
          nextActiveKeyToKeyframes.set(key, keyframes);
        }
      }
    }

    // Stop keys that are no longer controlled by any active target.
    for (const key of Array.from(running.keys())) {
      if (!nextActiveKeyToType.has(key)) stopKey(key);
    }

    const startedKeys: string[] = [];

    for (const [key, type] of nextActiveKeyToType.entries()) {
      const keyframes = nextActiveKeyToKeyframes.get(key);
      if (keyframes === undefined) continue;

      const mv = (nextValues as MotionValues)[key];
      if (!mv) continue;

      const shouldRestart =
        prevType.get(key) !== type ||
        !areKeyframesEqual(prevKeyframes.get(key), keyframes);

      prevType.set(key, type);
      prevKeyframes.set(key, keyframes);

      if (!shouldRestart) continue;

      stopKey(key);

      const target = activeTargetsByType[type];
      const transition =
        (target?.transition as Transition | undefined) ??
        (options.transition as Transition | undefined);
      const perKeyTransition = getTransitionForKey(transition, key);

      const controls = startMotionValueAnimation({
        name: key,
        motionValue: mv as MotionValue<string | number>,
        keyframes,
        transition: perKeyTransition as Transition | undefined,
      });

      if (controls) {
        running.set(key, { type, controls });
        startedKeys.push(key);
      }

      const final = pickFinalFromKeyframes(keyframes);
      if (final !== null) untrack(() => setState("goals", key, final));
    }

    if (typeof options.onAnimationStart === "function") {
      const startedAnimateKey = startedKeys.some(
        (k) => running.get(k)?.type === "animate",
      );
      if (startedAnimateKey && resolvedTargetsByType.animate) {
        options.onAnimationStart(resolvedTargetsByType.animate);
      }
    }

    // If the currently active "animate" definition finished, call onAnimationComplete.
    // We approximate "finished" as "all keys currently controlled by animate have finished".
    const animateTarget = activeTargetsByType.animate;
    if (animateTarget && typeof options.onAnimationComplete === "function") {
      const animateKeys = Object.keys(animateTarget).filter(
        (k) => k !== "transition" && k !== "transitionEnd",
      );

      const finishedPromises = animateKeys
        .map((k) => running.get(k))
        .filter(
          (
            v,
          ): v is {
            type: AnimationType;
            controls: AnimationPlaybackControlsWithThen;
          } => Boolean(v && v.type === "animate"),
        )
        .map((v) => v.controls.finished);

      if (finishedPromises.length > 0) {
        void Promise.allSettled(finishedPromises).then(() => {
          options.onAnimationComplete?.(animateTarget);

          const end = animateTarget.transitionEnd;
          if (end && typeof end === "object" && end !== null) {
            for (const [k, v] of Object.entries(end)) {
              if (!isStringOrNumber(v)) continue;
              const existing = state.values[k];
              if (!existing) continue;
              if (typeof v === "number") {
                (existing as MotionValue<number>).set(v);
              } else {
                (existing as MotionValue<string>).set(v);
              }
            }
          }
        });
      }
    }

    // Handle exit animation completion
    if (presence && presenceId && isExiting) {
      if (scheduledExitCycleId === exitCycleId) return;

      scheduledExitCycleId = exitCycleId;

      const exitTarget = activeTargetsByType.exit;
      if (!exitTarget) {
        // No `exit` target provided, complete immediately.
        presence.onExitComplete(presenceId);
        return;
      }

      const exitKeys = Object.keys(exitTarget).filter(
        (k) => k !== "transition" && k !== "transitionEnd",
      );

      const exitPromises = exitKeys
        .map((k) => running.get(k))
        .filter(
          (
            v,
          ): v is {
            type: AnimationType;
            controls: AnimationPlaybackControlsWithThen;
          } => Boolean(v && v.type === "exit"),
        )
        .map((v) => v.controls.finished);

      if (exitPromises.length > 0) {
        const cycleId = exitCycleId;
        void Promise.allSettled(exitPromises).then(() => {
          if (exitCycleId !== cycleId) return;
          if (presence.isPresent()) return;
          presence.onExitComplete(presenceId);
        });
      } else {
        // No tracked exit animations, complete immediately
        presence.onExitComplete(presenceId);
      }
    }
  });
};
