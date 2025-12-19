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
  VariantLabels,
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
import {
  resolveDefinitionToTarget,
  getTransitionForKey,
  isVariantLabels,
} from "./variants";
import type { PresenceContextValue } from "../component/presence";
import type { MotionConfigContextValue } from "../component/motion-config";
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
  getElement?: () => Element | null;
  motionConfig?: MotionConfigContextValue | null;
  /** Get additional delay from parent orchestration (stagger/delayChildren) */
  getOrchestrationDelay?: () => number;
  /** Parent orchestration context for beforeChildren/afterChildren coordination */
  parentOrchestration?: {
    childrenCanStart: () => Promise<void>;
    getWhen: () => false | "beforeChildren" | "afterChildren" | undefined;
  } | null;
  /** Callback to signal that this component's animation has completed */
  signalAnimationComplete?: () => void;
  /**
   * For this component as a parent: orchestration context we provide to children.
   * Used to signal parent completion and wait for children.
   */
  childOrchestration?: {
    getWhen: () => false | "beforeChildren" | "afterChildren" | undefined;
    waitForChildren: () => Promise<void>;
    signalParentComplete: () => void;
  } | null;
}

// Transform properties that should be disabled when reduced motion is active
const transformPropertiesSet = new Set([
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
  "translateX",
  "translateY",
  "translateZ",
  "perspective",
]);

export const useAnimationState = (args: AnimationStateOptions): void => {
  const {
    state,
    setState,
    options,
    presence,
    getElement,
    motionConfig,
    getOrchestrationDelay,
    parentOrchestration,
    signalAnimationComplete,
    childOrchestration,
  } = args;

  const latestValues = new Map<string, AnyResolvedKeyframe>();
  const renderState = createRenderState();
  const prevStyle = new Map<string, string>();
  const prevVars = new Map<string, string>();
  let frameId: number | null = null;
  let renderMicrotaskScheduled = false;
  let isUnmounted = false;

  const presenceId = presence ? createUniqueId() : null;

  if (presence && presenceId) {
    const unregister = presence.register(presenceId);
    onCleanup(unregister);
  }

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
    if (renderMicrotaskScheduled) return;

    if (typeof queueMicrotask === "function") {
      renderMicrotaskScheduled = true;
      queueMicrotask(() => {
        renderMicrotaskScheduled = false;
        if (isUnmounted) return;
        renderToDom();
      });
      return;
    }

    if (typeof requestAnimationFrame === "undefined") return;
    if (frameId !== null) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      renderToDom();
    });
  };

  onCleanup(() => {
    const el = getElement ? getElement() : state.element;

    /**
     * AnimatePresence exit handoff:
     * when a Motion component is unmounted, Solid disposes all reactive effects.
     * AnimatePresence keeps the *DOM element* in the tree via `createListTransition`,
     * so we need to run the exit animation imperatively and keep rendering MotionValue
     * changes to the element until completion.
     */
    if (presence && presenceId && el) {
      queueMicrotask(() => {
        // Only run the handoff if AnimatePresence actually kept the element in the DOM.
        if (!(el instanceof Element) || !el.isConnected) return;

        // Tell AnimatePresence to wait for us.
        (el as any).__motionIsAnimatingExit = true;

        // Minimal render scheduler (doesn't depend on Solid reactivity).
        let handoffFrame: number | null = null;
        let handoffScheduled = false;

        const scheduleHandoffRender = () => {
          if (handoffScheduled) return;
          handoffScheduled = true;

          if (typeof requestAnimationFrame === "function") {
            handoffFrame = requestAnimationFrame(() => {
              handoffFrame = null;
              handoffScheduled = false;
              renderToDom();
            });
            return;
          }

          if (typeof queueMicrotask === "function") {
            queueMicrotask(() => {
              handoffScheduled = false;
              renderToDom();
            });
            return;
          }

          handoffScheduled = false;
          renderToDom();
        };

        // Keep MotionValue -> DOM rendering alive during handoff.
        const unsubscribers: VoidFunction[] = [];
        for (const [key, mv] of Object.entries(state.values)) {
          latestValues.set(key, mv.get());
          unsubscribers.push(
            mv.on("change", (next) => {
              latestValues.set(key, next as AnyResolvedKeyframe);
              scheduleHandoffRender();
            }),
          );
        }

        const cleanupHandoff = () => {
          for (const unsub of unsubscribers) unsub();
          if (
            handoffFrame !== null &&
            typeof cancelAnimationFrame === "function"
          ) {
            cancelAnimationFrame(handoffFrame);
          }
          delete (el as any).__motionIsAnimatingExit;
        };

        // Ensure we render at least once in handoff mode.
        scheduleHandoffRender();

        const exitDef = options.exit;
        if (!exitDef) {
          cleanupHandoff();
          presence.onExitComplete(presenceId, el);
          return;
        }

        const target = resolveDefinitionToTarget({
          definition: exitDef,
          options,
          state,
        });

        if (!target) {
          cleanupHandoff();
          presence.onExitComplete(presenceId, el);
          return;
        }

        const exitKeys = Object.keys(target).filter(
          (k) => k !== "transition" && k !== "transitionEnd",
        );

        const promises: Array<Promise<unknown>> = [];

        for (const key of exitKeys) {
          const keyframes = (target as Record<string, unknown>)[key];
          const transition = (target as Record<string, unknown>).transition;
          const perKeyTransition = getTransitionForKey(
            (transition as Transition | undefined) ?? options.transition,
            key,
          );

          const mv = state.values[key];
          if (!mv) continue;

          const controls = startMotionValueAnimation({
            name: key,
            motionValue: mv as MotionValue<string | number>,
            keyframes,
            transition: perKeyTransition as Transition | undefined,
          });

          if (controls) promises.push(controls.finished);
        }

        if (promises.length === 0) {
          cleanupHandoff();
          presence.onExitComplete(presenceId, el);
          return;
        }

        void Promise.allSettled(promises).then(() => {
          cleanupHandoff();
          presence.onExitComplete(presenceId, el);
        });
      });
    }

    isUnmounted = true;
    renderMicrotaskScheduled = false;
    if (frameId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(frameId);
    }
    stopAll();
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
    layoutScroll: options.layoutScroll,
    layoutRoot: options.layoutRoot,
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

    // Update activeVariants state to track which variant labels are active
    for (const type of animationTypes) {
      const definition = definitions[type];
      untrack(() => {
        if (isVariantLabels(definition)) {
          setState("activeVariants", type, definition as VariantLabels);
        } else {
          setState("activeVariants", type, undefined);
        }
      });
    }
    // Also track initial variant
    untrack(() => {
      if (isVariantLabels(options.initial)) {
        setState("activeVariants", "initial", options.initial as VariantLabels);
      } else {
        setState("activeVariants", "initial", undefined);
      }
    });

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

    // Determine if we need to wait before starting animations
    const parentWhen = parentOrchestration?.getWhen();
    const childWhen = childOrchestration?.getWhen();
    const needsToWaitForParent = parentWhen === "beforeChildren";
    const needsToWaitForChildren = childWhen === "afterChildren";

    /**
     * Start animations for all keys that need to be animated.
     * This is extracted as a function so it can be called either synchronously
     * or after waiting for orchestration.
     */
    const startAnimations = () => {
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

        // Apply reduced motion: instant transition for transform properties
        const shouldReduceMotion = motionConfig?.isReducedMotion() ?? false;
        let finalTransition = perKeyTransition as Transition | undefined;
        if (shouldReduceMotion && transformPropertiesSet.has(key)) {
          finalTransition = { duration: 0 };
        }

        // Apply orchestration delay from parent (stagger/delayChildren)
        const orchestrationDelay = getOrchestrationDelay?.() ?? 0;
        if (orchestrationDelay > 0) {
          const existingDelay =
            (finalTransition as Record<string, unknown> | undefined)?.delay ??
            0;
          finalTransition = {
            ...finalTransition,
            delay:
              (typeof existingDelay === "number" ? existingDelay : 0) +
              orchestrationDelay,
          };
        }

        const controls = startMotionValueAnimation({
          name: key,
          motionValue: mv as MotionValue<string | number>,
          keyframes,
          transition: finalTransition,
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
    };

    // Handle orchestration waiting
    if (needsToWaitForParent || needsToWaitForChildren) {
      // Start animations asynchronously after waiting
      void (async () => {
        // Wait for parent to complete first (beforeChildren from parent's perspective)
        if (needsToWaitForParent && parentOrchestration) {
          await parentOrchestration.childrenCanStart();
        }

        // Wait for children to complete first (afterChildren from this component's perspective)
        if (needsToWaitForChildren && childOrchestration) {
          await childOrchestration.waitForChildren();
        }

        // Check if we were unmounted while waiting
        if (isUnmounted) return;

        startAnimations();
      })();
    } else {
      // Start animations synchronously (no orchestration waiting needed)
      startAnimations();
    }

    // If the currently active \"animate\" definition finished, call onAnimationComplete.
    // We approximate \"finished\" as \"all keys currently controlled by animate have finished\".\
    // Also apply transitionEnd for all animation types, not just animate.
    for (const type of animationTypes) {
      const target = activeTargetsByType[type];
      if (!target) continue;

      const typeKeys = Object.keys(target).filter(
        (k) => k !== "transition" && k !== "transitionEnd",
      );

      const typePromises = typeKeys
        .map((k) => running.get(k))
        .filter(
          (
            v,
          ): v is {
            type: AnimationType;
            controls: AnimationPlaybackControlsWithThen;
          } => Boolean(v && v.type === type),
        )
        .map((v) => v.controls.finished);

      if (typePromises.length > 0) {
        void Promise.allSettled(typePromises).then(() => {
          // Call onAnimationComplete callback for animate type only
          if (
            type === "animate" &&
            typeof options.onAnimationComplete === "function"
          ) {
            options.onAnimationComplete(target);
          }

          // Signal parent orchestration that this component's animation completed
          if (type === "animate" && signalAnimationComplete) {
            signalAnimationComplete();
          }

          // For beforeChildren: signal that children can now start
          if (type === "animate" && childOrchestration) {
            const when = childOrchestration.getWhen();
            if (when === "beforeChildren") {
              childOrchestration.signalParentComplete();
            }
          }

          // Apply transitionEnd values for all animation types
          const end = target.transitionEnd;
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
        presence.onExitComplete(presenceId, element || undefined);
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
          presence.onExitComplete(presenceId, element || undefined);
        });
      } else {
        // No tracked exit animations, complete immediately
        presence.onExitComplete(presenceId, element || undefined);
      }
    }
  });
};
