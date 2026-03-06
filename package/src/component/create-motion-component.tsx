import { mergeRefs } from "@solid-primitives/refs";
import {
  HTMLProjectionNode,
  HTMLVisualElement,
  SVGVisualElement,
  animateVisualElement,
  isControllingVariants,
  isMotionValue,
  isVariantLabel,
  resolveVariant,
  type AnimationDefinition,
  type MotionNodeOptions,
  type IProjectionNode,
} from "motion-dom";
import type { Component, ComponentProps, ValidComponent } from "solid-js";
import {
  createUniqueId,
  createSignal,
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  mergeProps,
  onCleanup,
  splitProps,
  untrack,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type {
  ElementInstance,
  ElementTag,
  MotionAnimationDefinition,
  MotionOptions,
  MotionStyle,
} from "../types";
import { isSVGElement } from "../types";
import { createDomVisualElement } from "./create-dom-visual-element";
import { filterProps } from "./filter-props";
import { initFeatureDefinitions } from "./feature-definitions";
import { useLayoutGroupContext } from "./layout-group-context";
import {
  MotionContext,
  useMotionContext,
  type MotionContextValue,
} from "./motion-context";
import { useMotionConfig } from "./motion-config";
import { motionKeys } from "./motion-keys";
import { normalizeMotionOptions } from "./normalize-props";
import { usePresenceContext } from "./presence";
import { useSwitchLayoutGroupContext } from "./switch-layout-group-context";
import {
  createInitialVisualProps,
  createVisualState,
  type VisualState,
} from "./visual-state";

type TransformStyle = Record<string, unknown>;

const camelToKebab = (key: string) =>
  key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

const toDomStyle = (style: TransformStyle | undefined) => {
  if (!style) return style;

  const domStyle: TransformStyle = {};

  for (const key in style) {
    const value = style[key];
    const styleKey =
      key.startsWith("--") || key.includes("-") ? key : camelToKebab(key);

    domStyle[styleKey] = value;
  }

  return domStyle;
};

type MotionPropsInternal<Tag extends ElementTag> = Omit<
  ComponentProps<Tag>,
  "onAnimationStart" | "onAnimationComplete"
> &
  MotionOptions<Tag> & {
    key?: string | number;
  };

export type MotionProps<Tag extends ElementTag> = Omit<
  MotionPropsInternal<Tag>,
  "style"
> & {
  style?: MotionStyle;
};

export interface MotionComponentOptions {
  forwardMotionProps?: boolean;
  type?: "html" | "svg";
}

type MotionExitMarker = Element & {
  __motionIsAnimatingExit?: boolean;
  __motionPresenceId?: string;
  __motionShouldExit?: boolean;
  __motionHandleExitComplete?: VoidFunction;
};

let hasTakenAnySnapshot = false;

const copyRawValuesOnly = (
  target: TransformStyle,
  source: MotionStyle | undefined,
  props: MotionOptions,
) => {
  if (!source || typeof source === "string") return;

  for (const key in source) {
    const value = source[key as keyof MotionStyle];
    if (!isMotionValue(value) && key !== "transformTemplate") {
      target[key] = value;
    }
  }

  if (props.drag && props.dragListener !== false) {
    target.userSelect = "none";
    target.WebkitUserSelect = "none";
    target.WebkitTouchCallout = "none";
    target.touchAction =
      props.drag === true ? "none" : props.drag === "x" ? "pan-y" : "pan-x";
  }
};

const getCurrentTreeVariants = (
  props: MotionOptions,
  context: MotionContextValue,
): MotionContextValue => {
  if (isControllingVariants(props as unknown as MotionNodeOptions)) {
    const { initial, animate } = props;
    return {
      initial:
        initial === false || isVariantLabel(initial)
          ? (initial as false | string | string[])
          : undefined,
      animate: isVariantLabel(animate)
        ? (animate as string | string[])
        : undefined,
    };
  }

  return props.inherit !== false ? context : {};
};

const getClosestProjectingNode = (
  visualElement?: MotionContextValue["visualElement"],
): IProjectionNode | undefined => {
  if (!visualElement) return undefined;

  const options = visualElement.options as { allowProjection?: boolean };

  return options.allowProjection !== false
    ? visualElement.projection
    : getClosestProjectingNode(visualElement.parent);
};

const shouldCreateProjectionNode = (props: MotionOptions) =>
  Boolean(
    props.layout || props.layoutId || props.layoutScroll || props.layoutRoot,
  );

const getTransitionRuntimeMs = (definition: unknown) => {
  const readDuration = (transition: unknown): number => {
    if (
      !transition ||
      typeof transition !== "object" ||
      Array.isArray(transition)
    ) {
      return 0;
    }

    const source = transition as Record<string, unknown>;
    const duration = typeof source.duration === "number" ? source.duration : 0;
    const delay = typeof source.delay === "number" ? source.delay : 0;
    const repeat = typeof source.repeat === "number" ? source.repeat : 0;
    const repeatDelay =
      typeof source.repeatDelay === "number" ? source.repeatDelay : 0;
    let max = delay + duration * Math.max(repeat + 1, 1) + repeatDelay * repeat;

    for (const key in source) {
      const value = source[key];
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      max = Math.max(max, readDuration(value));
    }

    return max;
  };

  const readTargetDuration = (target: unknown): number => {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      return 0.3;
    }

    const source = target as { transition?: unknown };
    return readDuration(source.transition) || 0.3;
  };

  if (Array.isArray(definition)) {
    return (
      Math.max(...definition.map((entry) => readTargetDuration(entry)), 0.3) *
        1000 +
      100
    );
  }

  return readTargetDuration(definition) * 1000 + 100;
};

export const createMotionComponent = <Tag extends ElementTag = "div">(
  component: Tag | ValidComponent,
  options: MotionComponentOptions = {},
): Component<MotionProps<Tag>> => {
  initFeatureDefinitions();

  const isSVG = options.type
    ? options.type === "svg"
    : typeof component === "string"
      ? isSVGElement(component as Tag)
      : false;
  const componentTag =
    typeof component === "string" ? component : isSVG ? "svg" : "div";

  const MotionComponent = (props: MotionPropsInternal<Tag>) => {
    const parentContext = useMotionContext();
    const layoutGroup = useLayoutGroupContext();
    const switchLayoutGroup = useSwitchLayoutGroupContext();
    const motionConfig = useMotionConfig();
    const presence = usePresenceContext();
    const presenceId = createUniqueId();
    let currentElement: ElementInstance<Tag> | null = null;
    const [latestDidUpdateId, setLatestDidUpdateId] = createSignal(0);
    let isMounted = false;
    let isCleaningUp = false;
    let animationChangesId = 0;
    const isPresent = () => presence?.isPresent() ?? true;
    const [local, motionOptions, domProps] = splitProps(
      props as Record<string, unknown>,
      [
        "ref",
        "style",
        "children",
        "class",
        "classList",
        "textContent",
        "innerHTML",
      ],
      motionKeys as readonly string[],
    ) as unknown as [
      {
        ref?: unknown;
        style?: MotionStyle;
        children?: unknown;
        class?: unknown;
        classList?: unknown;
        textContent?: unknown;
        innerHTML?: unknown;
      },
      MotionOptions<ElementTag>,
      Record<string, unknown>,
    ];

    const layoutId = createMemo(() =>
      layoutGroup.id && motionOptions.layoutId !== undefined
        ? `${layoutGroup.id}-${motionOptions.layoutId}`
        : motionOptions.layoutId,
    );

    const resolvedMotionOptions = createMemo(() => {
      const onAnimationStart = motionOptions.onAnimationStart;
      const onAnimationComplete = motionOptions.onAnimationComplete;
      const rawOptions = mergeProps(motionOptions, {
        style: local.style,
        transition: motionOptions.transition ?? motionConfig?.transition(),
        initial:
          presence && !presence.initial() ? false : motionOptions.initial,
        custom:
          motionOptions.custom !== undefined
            ? motionOptions.custom
            : presence?.custom(),
        onAnimationStart:
          typeof onAnimationStart === "function"
            ? (definition: MotionAnimationDefinition) => {
                const marker = currentElement as MotionExitMarker | null;
                if (marker?.__motionShouldExit || !isPresent()) return;
                onAnimationStart(definition);
              }
            : undefined,
        onAnimationComplete:
          typeof onAnimationComplete === "function"
            ? (definition: MotionAnimationDefinition) => {
                const marker = currentElement as MotionExitMarker | null;
                if (marker?.__motionShouldExit || !isPresent()) return;
                onAnimationComplete(definition);
              }
            : undefined,
        layoutId: layoutId(),
      }) as MotionOptions<ElementTag>;

      return normalizeMotionOptions(rawOptions);
    });

    const motionDomPresenceContext = createMemo(() =>
      presence
        ? {
            id: presence.id ?? presenceId,
            initial:
              presence.initial() === false
                ? false
                : (undefined as false | undefined),
            isPresent: presence.isPresent(),
            custom: presence.custom(),
            onExitComplete: (id: string | number) =>
              presence.onExitComplete(String(id), currentElement ?? undefined),
            register: (id: string | number) => presence.register(id),
          }
        : null,
    );

    const treeVariants = createMemo(() =>
      getCurrentTreeVariants(resolvedMotionOptions(), parentContext),
    );

    const initialVisualState = untrack(() =>
      createVisualState(
        resolvedMotionOptions(),
        treeVariants(),
        presence
          ? {
              initial: presence.initial(),
              custom: presence.custom(),
            }
          : null,
        isSVG,
      ),
    ) as VisualState<HTMLElement | SVGElement, unknown>;

    const visualElement = createDomVisualElement(componentTag, {
      visualState: initialVisualState,
      parent: parentContext.visualElement,
      props: resolvedMotionOptions() as unknown as MotionNodeOptions,
      presenceContext: motionDomPresenceContext(),
      blockInitialAnimation: presence ? !presence.initial() : false,
      reducedMotionConfig: motionConfig?.reducedMotion(),
      isSVG,
    });

    const unregisterPresence = presence?.register?.(presenceId);
    if (unregisterPresence) {
      onCleanup(unregisterPresence);
    }

    const ensureProjectionNode = (nodeOptions: MotionOptions) => {
      if (typeof window === "undefined" || visualElement.projection) return;
      if (!shouldCreateProjectionNode(nodeOptions)) return;

      visualElement.projection = new HTMLProjectionNode(
        visualElement.latestValues,
        nodeOptions["data-framer-portal-id"]
          ? undefined
          : getClosestProjectingNode(parentContext.visualElement),
      );

      if (currentElement && !visualElement.projection.instance) {
        visualElement.projection.mount(
          currentElement as unknown as HTMLElement,
        );
      }
    };

    const updateProjectionOptions = (nodeOptions: MotionOptions) => {
      const projection = visualElement.projection;
      if (!projection) return;

      projection.setOptions({
        layoutId: nodeOptions.layoutId,
        layout: nodeOptions.layout,
        alwaysMeasureLayout:
          Boolean(nodeOptions.drag) ||
          (typeof Element !== "undefined" &&
            nodeOptions.dragConstraints instanceof Element),
        layoutScroll: nodeOptions.layoutScroll,
        layoutRoot: nodeOptions.layoutRoot,
        crossfade: nodeOptions.layoutCrossfade,
        layoutDependency: nodeOptions.layoutDependency,
        visualElement,
        animationType:
          typeof nodeOptions.layout === "string" ? nodeOptions.layout : "both",
        initialPromotionConfig: switchLayoutGroup,
        onExitComplete: () =>
          presence?.onExitComplete(presenceId, currentElement ?? undefined),
      });
    };

    const initialProjectionOptions = untrack(resolvedMotionOptions);
    ensureProjectionNode(initialProjectionOptions);
    updateProjectionOptions(initialProjectionOptions);

    createComputed<
      { layoutDependency: unknown; isPresent: boolean } | undefined
    >((prev) => {
      const props = resolvedMotionOptions();
      const currentIsPresent = isPresent();

      local.class;
      local.classList;
      local.children;
      local.textContent;
      local.innerHTML;
      props.style;

      if (!isMounted || !visualElement.projection) {
        return {
          layoutDependency: props.layoutDependency,
          isPresent: currentIsPresent,
        };
      }

      visualElement.projection.isPresent = currentIsPresent;
      updateProjectionOptions(props);

      const shouldMeasure =
        props.layoutDependency === undefined ||
        prev?.layoutDependency !== props.layoutDependency ||
        prev?.isPresent !== currentIsPresent;

      if (shouldMeasure) {
        hasTakenAnySnapshot = true;
        visualElement.projection.willUpdate();
        setLatestDidUpdateId((value: number) => value + 1);
      }

      return {
        layoutDependency: props.layoutDependency,
        isPresent: currentIsPresent,
      };
    });

    const visualProps = createMemo(() => {
      const props = resolvedMotionOptions();
      const initialProps = createInitialVisualProps(
        componentTag,
        props,
        visualElement.latestValues,
        isSVG,
      );
      const normalizedStyle = props.style;
      const style = {};

      copyRawValuesOnly(style, normalizedStyle, props);

      const initialStyle = initialProps.style as TransformStyle | undefined;
      const mergedStyle =
        style && initialStyle
          ? { ...style, ...initialStyle }
          : style || initialStyle;

      const forwardedProps: Record<string, unknown> = {
        ...domProps,
      };

      if (local.class !== undefined) {
        forwardedProps.class = local.class;
      }

      if (local.classList !== undefined) {
        forwardedProps.classList = local.classList;
      }

      if (local.textContent !== undefined) {
        forwardedProps.textContent = local.textContent;
      }

      if (local.innerHTML !== undefined) {
        forwardedProps.innerHTML = local.innerHTML;
      }

      if (
        (options.forwardMotionProps ?? false) &&
        typeof component !== "string"
      ) {
        Object.assign(forwardedProps, motionOptions);
      }

      const filteredProps = filterProps(
        forwardedProps as MotionOptions & Record<string, unknown>,
        typeof component === "string",
        options.forwardMotionProps ?? false,
      );
      delete filteredProps.children;
      delete filteredProps.ref;

      if (
        filteredProps.tabIndex === undefined &&
        (props.onTap || props.onTapStart || props.whileTap)
      ) {
        filteredProps.tabIndex = 0;
      }

      if (props.drag && props.dragListener !== false) {
        filteredProps.draggable = false;
      }

      return {
        ...filteredProps,
        ...initialProps,
        style: toDomStyle(mergedStyle),
      };
    });

    const ref = mergeRefs<ElementInstance<Tag>>(
      local.ref as ((el: ElementInstance<Tag>) => void) | undefined,
      (element) => {
        currentElement = element ?? null;

        if (element) {
          (element as unknown as MotionExitMarker).__motionIsAnimatingExit =
            false;
          if (isSVG) {
            (visualElement as SVGVisualElement).mount(
              element as unknown as SVGElement,
            );
          } else {
            (visualElement as HTMLVisualElement).mount(
              element as unknown as HTMLElement,
            );
          }
          isMounted = true;
          visualElement.updateFeatures();
          visualElement.scheduleRenderMicrotask();
          void visualElement.animationState?.animateChanges();
          visualElement.enteringChildren = undefined;
        }
      },
    );

    createRenderEffect(() => {
      const props = resolvedMotionOptions();

      ensureProjectionNode(props);
      updateProjectionOptions(props);

      visualElement.update(
        props as unknown as MotionNodeOptions,
        motionDomPresenceContext(),
      );

      if (visualElement.projection && layoutGroup.group) {
        layoutGroup.group.add(visualElement.projection);
      }

      if (
        visualElement.projection &&
        switchLayoutGroup.register &&
        props.layoutId
      ) {
        switchLayoutGroup.register(visualElement.projection);
      }

      if (isMounted) {
        visualElement.updateFeatures();
        visualElement.scheduleRenderMicrotask();
      }
    });

    createEffect(() => {
      if (!isMounted) return;

      resolvedMotionOptions();
      const currentIsPresent = isPresent();
      const currentAnimationChangesId = ++animationChangesId;

      queueMicrotask(() => {
        if (isCleaningUp) return;
        if (currentAnimationChangesId !== animationChangesId) return;

        const marker = currentElement as MotionExitMarker | null;
        if (
          !currentElement ||
          marker?.__motionShouldExit ||
          !currentIsPresent
        ) {
          return;
        }

        visualElement.animationState?.animateChanges();
        visualElement.enteringChildren = undefined;
      });
    });

    createRenderEffect(() => {
      const didUpdateId = latestDidUpdateId();
      if (!didUpdateId || !visualElement.projection) return;

      queueMicrotask(() => {
        if (!visualElement.projection) return;
        if (didUpdateId !== latestDidUpdateId()) return;

        if (hasTakenAnySnapshot) {
          visualElement.projection.root?.didUpdate();
        }

        queueMicrotask(() => {
          const projection = visualElement.projection;
          if (
            projection &&
            !projection.currentAnimation &&
            projection.isLead() &&
            !isPresent()
          ) {
            presence?.onExitComplete(presenceId, currentElement ?? undefined);
          }
        });
      });
    });

    onCleanup(() => {
      isCleaningUp = true;
      animationChangesId++;

      const projection = visualElement.projection;
      const element = currentElement;

      if (projection) {
        hasTakenAnySnapshot = true;
        projection.scheduleCheckAfterUnmount();

        if (layoutGroup.group) {
          layoutGroup.group.remove(projection);
        }

        if (switchLayoutGroup.deregister) {
          switchLayoutGroup.deregister(projection);
        }
      }

      const marker = element as MotionExitMarker | null;
      const shouldHandoff = Boolean(marker?.__motionShouldExit) || !isPresent();

      if (
        !presence &&
        (!element || !shouldHandoff || !element.isConnected || !marker)
      ) {
        visualElement.unmount();
        return;
      }

      queueMicrotask(() => {
        const queuedMarker = element as MotionExitMarker | null;
        const queuedShouldHandoff =
          Boolean(queuedMarker?.__motionShouldExit) || !isPresent();

        if (
          !element ||
          !queuedShouldHandoff ||
          !element.isConnected ||
          !queuedMarker
        ) {
          visualElement.unmount();
          return;
        }

        queuedMarker.__motionIsAnimatingExit = true;
        queuedMarker.__motionPresenceId = presenceId;

        const exitDefinition = visualElement.getProps().exit as
          | MotionAnimationDefinition
          | undefined;

        if (!exitDefinition || exitDefinition === true) {
          queuedMarker.__motionIsAnimatingExit = false;
          presence?.onExitComplete(presenceId, element);
          visualElement.unmount();
          return;
        }

        const exitAnimation = exitDefinition as AnimationDefinition;
        const resolvedExitDefinition =
          typeof exitDefinition === "string" ||
          typeof exitDefinition === "function"
            ? resolveVariant(
                visualElement,
                exitDefinition,
                visualElement.presenceContext?.custom,
              )
            : exitDefinition;
        const exitTimeoutMs = getTransitionRuntimeMs(
          resolvedExitDefinition ?? exitDefinition,
        );
        let exitTimeout: ReturnType<typeof setTimeout> | undefined;
        let hasCompletedExit = false;

        const completeExit = () => {
          if (hasCompletedExit) return;
          hasCompletedExit = true;

          if (exitTimeout !== undefined) {
            clearTimeout(exitTimeout);
          }

          queuedMarker.__motionIsAnimatingExit = false;
          queuedMarker.__motionHandleExitComplete?.();
          presence?.onExitComplete(presenceId, element);
          visualElement.unmount();
        };

        exitTimeout = setTimeout(completeExit, exitTimeoutMs);

        const exitAnimationPromise =
          visualElement.animationState?.setActive("exit", true, {
            type: "exit",
            custom: visualElement.presenceContext?.custom,
          }) ??
          animateVisualElement(visualElement, exitAnimation, {
            type: "exit",
            custom: visualElement.presenceContext?.custom,
          });

        void exitAnimationPromise.catch(() => undefined).then(completeExit);
      });
    });

    return (
      <MotionContext.Provider
        value={{
          ...treeVariants(),
          visualElement,
        }}
      >
        <Dynamic
          component={component as ValidComponent}
          {...visualProps()}
          ref={ref}
        >
          {(() => {
            const children = local.children;
            return isMotionValue(children) ? children.get() : children;
          })()}
        </Dynamic>
      </MotionContext.Provider>
    );
  };

  return MotionComponent as unknown as Component<MotionProps<Tag>>;
};
