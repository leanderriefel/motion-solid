import type { Component, ComponentProps } from "solid-js";
import {
  createComputed,
  createMemo,
  createRenderEffect,
  createSignal,
  mergeProps,
  splitProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { createStore } from "solid-js/store";
import { mergeRefs } from "@solid-primitives/refs";
import type { Variants } from "motion-dom";
import type {
  ElementInstance,
  ElementTag,
  MotionElement,
  MotionOptions,
} from "../types";
import { createMotionState } from "../state";
import { useAnimationState } from "../animation";
import { useGestures, useDragGesture } from "../gestures";
import { projectionManager } from "../projection/projection-manager";
import { MotionStateContext, useMotionState } from "./context";
import { useMotionConfig } from "./motion-config";
import { motionKeys } from "./motion-keys";
import { usePresenceContext } from "./presence";
import {
  OrchestrationContext,
  useOrchestration,
  type OrchestrationContextValue,
} from "./orchestration-context";
import { isStaggerFunction, type StaggerFunction } from "../animation/stagger";
import { resolveDefinitionToTarget } from "../animation/variants";
import { pickInitialFromKeyframes } from "../animation/keyframes";
import {
  buildHTMLStyles,
  buildTransform,
  createRenderState,
} from "../animation/render";

type TransformTemplate = (
  transform: Record<string, string | number>,
  generatedTransform: string,
) => string;

/**
 * Transform shortcut properties that can be used in the style prop.
 * These will be converted to a CSS transform string.
 */
const styleTransformShortcuts = new Set([
  "x",
  "y",
  "z",
  "rotate",
  "rotate-x",
  "rotate-y",
  "rotate-z",
  "scale",
  "scale-x",
  "scale-y",
  "scale-z",
  "skew",
  "skew-x",
  "skew-y",
  "translate-x",
  "translate-y",
  "translate-z",
  "perspective",
  "transform-perspective",
]);

/**
 * Process style prop to handle transform shortcuts.
 * Returns the processed style object.
 *
 * @param style - The raw style prop
 */
const processStyleProp = (
  style: Record<string, string | number> | string | undefined,
): Record<string, string | number> => {
  if (!style || typeof style === "string") {
    return {};
  }

  const processedStyle: Record<string, string | number> = {};
  const transformValues: Record<string, string | number> = {};
  let hasTransformShortcuts = false;

  for (const key in style) {
    const value = style[key];
    if (value === undefined) continue;

    // Check if it's a transform shortcut
    if (styleTransformShortcuts.has(key)) {
      hasTransformShortcuts = true;
      transformValues[key] = value;
      continue;
    }

    // Pass through to processed style
    processedStyle[key] = value;
  }

  // If we have transform shortcuts, build the transform string
  if (hasTransformShortcuts) {
    const renderState = createRenderState();
    const transformString = buildTransform(
      transformValues,
      renderState.transform,
    );
    if (transformString && transformString !== "none") {
      // Merge with existing transform if present
      const existingTransform = processedStyle.transform;
      if (existingTransform && typeof existingTransform === "string") {
        processedStyle.transform = `${transformString} ${existingTransform}`;
      } else {
        processedStyle.transform = transformString;
      }
    }
  }

  return processedStyle;
};

const getInitialStyles = (
  options: MotionOptions,
  parent: any,
): Record<string, string> => {
  const initialDefinition = options.initial;
  const definition = initialDefinition ? initialDefinition : options.animate;
  if (!definition) return {};

  const minimalState = {
    element: null,
    values: {},
    goals: {},
    resolvedValues: {},
    activeGestures: {
      hover: false,
      tap: false,
      focus: false,
      drag: false,
      inView: false,
    },
    activeVariants: {},
    options,
    parent,
  };

  const target = resolveDefinitionToTarget({
    definition,
    options,
    state: minimalState,
  });

  if (!target) return {};

  const values: Record<string, string | number> = {};
  for (const [key, keyframes] of Object.entries(target)) {
    if (key === "transition" || key === "transitionEnd") continue;

    const initial = pickInitialFromKeyframes(keyframes);
    if (initial !== null) {
      values[key] = initial;
    }
  }

  const renderState = createRenderState();
  buildHTMLStyles(
    renderState,
    values,
    options.transformTemplate as TransformTemplate | undefined,
  );

  return renderState.style as Record<string, string>;
};

export type MotionProps<Tag extends ElementTag> = ComponentProps<Tag> &
  MotionOptions & {
    key?: string | number;
  };

interface OrchestrationOptions {
  when?: false | "beforeChildren" | "afterChildren";
  delayChildren?: number | StaggerFunction;
  staggerChildren?: number;
  staggerDirection?: number;
}

/**
 * Extract orchestration options from a variant's transition.
 * Only works when the animation definition is a variant label.
 */
const extractOrchestrationOptions = (
  animateDef: unknown,
  variants: Variants | undefined,
): OrchestrationOptions | null => {
  if (!variants) return null;

  // Only extract orchestration from variant labels
  if (typeof animateDef !== "string" && !Array.isArray(animateDef)) {
    return null;
  }

  const variantName = Array.isArray(animateDef) ? animateDef[0] : animateDef;
  const variant = variants[variantName];

  if (!variant || typeof variant !== "object") return null;

  const transition = (variant as Record<string, unknown>).transition as
    | Record<string, unknown>
    | undefined;
  if (!transition) return null;

  const result: OrchestrationOptions = {};

  if (
    transition.when === "beforeChildren" ||
    transition.when === "afterChildren" ||
    transition.when === false
  ) {
    result.when = transition.when;
  }

  if (typeof transition.delayChildren === "number") {
    result.delayChildren = transition.delayChildren;
  } else if (isStaggerFunction(transition.delayChildren)) {
    result.delayChildren = transition.delayChildren;
  }

  if (typeof transition.staggerChildren === "number") {
    result.staggerChildren = transition.staggerChildren;
  }

  if (typeof transition.staggerDirection === "number") {
    result.staggerDirection = transition.staggerDirection;
  }

  // Only return if there are actual orchestration options
  if (Object.keys(result).length === 0) return null;

  return result;
};

export const createMotionComponent = <Tag extends ElementTag = "div">(
  tag: Tag,
): Component<MotionProps<Tag>> => {
  return (props) => {
    const context = useMotionState();
    const parent = context ? context[0] : null;
    const presence = usePresenceContext();
    const motionConfig = useMotionConfig();
    const parentOrchestration = useOrchestration();
    const [local, motionOptions, rest] = splitProps(props, ["ref"], motionKeys);

    const [styleProps, elementProps] = splitProps(rest, ["style"]);

    const resolvedMotionOptions = mergeProps(motionOptions, {
      get transition() {
        return motionOptions.transition ?? motionConfig?.transition();
      },
      get initial() {
        if (presence && !presence.initial()) return false;
        return motionOptions.initial;
      },
      get custom() {
        if (motionOptions.custom !== undefined) return motionOptions.custom;
        return presence?.custom();
      },
    });

    const initialStyles = createMemo(() => {
      return getInitialStyles(resolvedMotionOptions, parent);
    });

    // Register this component as a child with parent's orchestration
    let childIndex = 0;
    if (parentOrchestration) {
      childIndex = parentOrchestration.registerChild();
    }

    // Orchestration state for this component's children
    let registeredChildCount = 0;
    let completedChildCount = 0;

    // For "beforeChildren": promise that resolves when parent animation completes
    let parentCompleteResolver: (() => void) | null = null;
    const [childrenCanStartPromise, setChildrenCanStartPromise] = createSignal(
      Promise.resolve(),
    );

    // For "afterChildren": promise that resolves when all children have completed
    let afterChildrenResolver: (() => void) | null = null;
    let afterChildrenPromise: Promise<void> | null = null;

    // Create orchestration context for this component's children
    const orchestrationOptions = createMemo(() =>
      extractOrchestrationOptions(
        resolvedMotionOptions.animate,
        resolvedMotionOptions.variants as Variants | undefined,
      ),
    );

    // When orchestration options change, set up the childrenCanStart promise
    createRenderEffect(() => {
      const orch = orchestrationOptions();
      const when = orch?.when;

      if (when === "beforeChildren") {
        // Children must wait for parent to signal completion
        let resolver: () => void;
        const promise = new Promise<void>((resolve) => {
          resolver = resolve;
        });
        parentCompleteResolver = resolver!;
        setChildrenCanStartPromise(promise);
      } else {
        // Children can start immediately (no orchestration or afterChildren)
        parentCompleteResolver = null;
        setChildrenCanStartPromise(Promise.resolve());
      }

      // Reset child completion tracking
      completedChildCount = 0;
      afterChildrenResolver = null;
      afterChildrenPromise = null;
    });

    const childOrchestration: OrchestrationContextValue = {
      childrenCanStart: childrenCanStartPromise,
      signalChildComplete: () => {
        completedChildCount++;
        // Check if all registered children have completed
        if (
          afterChildrenResolver &&
          completedChildCount >= registeredChildCount
        ) {
          afterChildrenResolver();
          afterChildrenResolver = null;
        }
      },
      getChildDelay: (idx: number) => {
        const orch = orchestrationOptions();
        if (!orch) return 0;

        let baseDelay = 0;
        const total = registeredChildCount || 1;
        const direction = orch.staggerDirection ?? 1;

        // Handle delayChildren
        if (typeof orch.delayChildren === "number") {
          baseDelay = orch.delayChildren;
        } else if (isStaggerFunction(orch.delayChildren)) {
          baseDelay = orch.delayChildren(
            direction === 1 ? idx : total - 1 - idx,
            total,
          );
        }

        // Handle deprecated staggerChildren
        if (orch.staggerChildren) {
          const staggerIndex = direction === 1 ? idx : total - 1 - idx;
          baseDelay += orch.staggerChildren * staggerIndex;
        }

        return baseDelay;
      },
      registerChild: () => {
        return registeredChildCount++;
      },
      getChildCount: () => registeredChildCount,
      getWhen: () => orchestrationOptions()?.when,
      waitForChildren: () => {
        // If no children registered, resolve immediately
        if (registeredChildCount === 0) {
          return Promise.resolve();
        }

        // If all children already completed, resolve immediately
        if (completedChildCount >= registeredChildCount) {
          return Promise.resolve();
        }

        // Create a promise that resolves when all children complete
        if (!afterChildrenPromise) {
          afterChildrenPromise = new Promise<void>((resolve) => {
            afterChildrenResolver = resolve;
          });
        }

        return afterChildrenPromise;
      },
      signalParentComplete: () => {
        if (parentCompleteResolver) {
          parentCompleteResolver();
          parentCompleteResolver = null;
        }
      },
    };

    const [state, setState] = createStore(
      createMotionState({
        options: resolvedMotionOptions,
        parent,
      }),
    );

    let cachedElement: Element | null = null;

    // Process style prop for transform shortcuts.
    // Keep raw values available so projection can restore overrides.
    const processedStyleData = createMemo<Record<string, string | number>>(
      () => {
        const rawStyle = styleProps.style as
          | Record<string, string | number>
          | string
          | undefined;
        // Never exclude - let Solid render the raw values, renderToDom will correct when needed
        return processStyleProp(rawStyle);
      },
    );

    const getStyleValues = () => processedStyleData();

    // Calculate additional delay from parent orchestration
    const getParentOrchestrationDelay = (): number => {
      if (!parentOrchestration) return 0;
      return parentOrchestration.getChildDelay(childIndex);
    };

    useAnimationState({
      state,
      setState,
      options: resolvedMotionOptions,
      presence,
      getElement: () => cachedElement,
      motionConfig,
      getOrchestrationDelay: getParentOrchestrationDelay,
      parentOrchestration,
      signalAnimationComplete: () => {
        parentOrchestration?.signalChildComplete();
      },
      childOrchestration,
      getStyleValues,
    });
    useGestures({ state, setState, options: resolvedMotionOptions });
    useDragGesture({ state, setState, options: resolvedMotionOptions });

    const ref = mergeRefs<ElementInstance<Tag> & MotionElement>(
      local.ref as ElementInstance<Tag> & MotionElement,
      (el) => {
        if (el) {
          cachedElement = el;
          (el as any).__motionSolid = true;
        }
        setState("element", el);
      },
    );

    const mergedStyles = createMemo(() => {
      const initial = initialStyles();
      const processedStyle = processedStyleData();
      return { ...processedStyle, ...initial };
    });

    let didAutoLayoutSnapshot = false;

    createComputed(() => {
      const layoutEnabled =
        Boolean(motionOptions.layout) || Boolean(motionOptions.layoutId);

      if (!layoutEnabled) {
        didAutoLayoutSnapshot = false;
        return;
      }

      if (
        !motionOptions.layoutDependencies ||
        motionOptions.layoutDependencies.length === 0
      ) {
        void motionOptions.layoutRoot;
        void motionOptions.layoutScroll;
        void motionOptions.layoutCrossfade;
        void styleProps.style;
        void (elementProps as Record<string, unknown>).class;
        void (elementProps as Record<string, unknown>).classList;
        void (elementProps as Record<string, unknown>).textContent;
        void (elementProps as Record<string, unknown>).innerHTML;
      } else {
        const dependencies = motionOptions.layoutDependencies;
        if (dependencies) {
          for (const dependency of dependencies) {
            if (typeof dependency === "function") {
              dependency();
            }
          }
        }
      }

      const element = state.element;
      if (!element) {
        didAutoLayoutSnapshot = false;
        return;
      }

      if (!didAutoLayoutSnapshot) {
        didAutoLayoutSnapshot = true;
        return;
      }

      projectionManager.scheduleUpdate(state.element);
    });

    return (
      <MotionStateContext.Provider value={[state, setState]}>
        <OrchestrationContext.Provider value={childOrchestration}>
          <Dynamic
            component={tag}
            {...(elementProps as ComponentProps<Tag>)}
            style={mergedStyles() as any}
            ref={ref}
          />
        </OrchestrationContext.Provider>
      </MotionStateContext.Provider>
    );
  };
};
