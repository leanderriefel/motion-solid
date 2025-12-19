import type { Component, ComponentProps } from "solid-js";
import {
  createMemo,
  createRenderEffect,
  createSignal,
  mergeProps,
  splitProps,
} from "solid-js";
import { createDynamic } from "solid-js/web";
import { createStore } from "solid-js/store";
import { mergeRefs } from "@solid-primitives/refs";
import type { Transition, Variants } from "motion-dom";
import type {
  ElementInstance,
  ElementTag,
  MotionElement,
  MotionOptions,
} from "../types";
import { createMotionState } from "../state";
import { useAnimationState } from "../animation";
import { useGestures, useDragGesture } from "../gestures";
import { layoutManager } from "../layout/layout-manager";
import { MotionStateContext, useMotionState } from "./context";
import { useMotionConfig } from "./motion-config.tsx";
import { motionKeys } from "./motion-keys";
import { usePresenceContext } from "./presence.tsx";
import {
  OrchestrationContext,
  useOrchestration,
  type OrchestrationContextValue,
  type WhenOrchestration,
} from "./orchestration-context";
import { isStaggerFunction, type StaggerFunction } from "../animation/stagger";

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
    const [local, motionOptions, elementProps] = splitProps(
      props,
      ["ref"],
      motionKeys,
    );

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

    const layoutEnabled = createMemo(
      () =>
        Boolean(resolvedMotionOptions.layout) ||
        Boolean(resolvedMotionOptions.layoutId),
    );

    // Track prop changes that may affect layout (class, style, children)
    // Skip initial mount since register() already calls scheduleUpdate()
    let isFirstRun = true;
    createRenderEffect(() => {
      if (!layoutEnabled()) return;

      // Access props to create tracking dependencies
      void elementProps.class;
      void elementProps.classList;
      void elementProps.style;
      void elementProps.children;

      // Skip the first run - register() handles initial measurement
      if (isFirstRun) {
        isFirstRun = false;
        return;
      }

      layoutManager.scheduleUpdate();
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
    });
    useGestures({ state, setState, options: resolvedMotionOptions });
    useDragGesture({ state, setState, options: resolvedMotionOptions });

    const ref = mergeRefs<ElementInstance<Tag> & MotionElement>(
      local.ref as ElementInstance<Tag> & MotionElement,
      (el) => {
        if (el) cachedElement = el;
        setState("element", el);
      },
    );

    return (
      <MotionStateContext.Provider value={[state, setState]}>
        <OrchestrationContext.Provider value={childOrchestration}>
          {createDynamic(() => tag, {
            ...(elementProps as ComponentProps<Tag>),
            ref,
          })}
        </OrchestrationContext.Provider>
      </MotionStateContext.Provider>
    );
  };
};
