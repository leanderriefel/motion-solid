import { mergeRefs } from "@solid-primitives/refs";
import { resolveElements } from "@solid-primitives/refs";
import {
  HTMLProjectionNode,
  HTMLVisualElement,
  SVGVisualElement,
  animateVisualElement,
  frame,
  isControllingVariants,
  isMotionValue,
  isVariantLabel,
  resolveVariant,
  type AnimationDefinition,
  type MotionNodeOptions,
  type IProjectionNode,
} from "motion-dom";
import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import {
  createUniqueId,
  createSignal,
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  mergeProps,
  onCleanup,
  onMount,
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

type LayoutDebugRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type LayoutDebugPhase =
  | "willUpdate"
  | "didUpdate"
  | "mutationRecovery"
  | "animationStart"
  | "animationComplete"
  | "firstAnimatedFrame";

type LayoutDebugEvent = {
  time: number;
  phase: LayoutDebugPhase;
  projectionId: number | null;
  layoutId: string | null;
  testId: string | null;
  debugId?: string | null;
  rectBeforeMutation: LayoutDebugRect | null;
  afterRect?: LayoutDebugRect | null;
  snapshotRect?: LayoutDebugRect | null;
  layoutRect?: LayoutDebugRect | null;
  targetRect?: LayoutDebugRect | null;
  didRunWillUpdate?: boolean;
  recoveredByMutationObserver?: boolean;
  mutationRecoveryOnly?: boolean;
  measurementReasons?: string[];
  broadcastedNodes?: number;
  mutationRecordCount?: number;
  refreshedResumeSnapshot?: boolean;
  scrollX?: number;
  scrollY?: number;
  isLead?: boolean;
  isLayoutDirty?: boolean;
  hasCurrentAnimation?: boolean;
  transform?: string | null;
  boxChanged?: boolean | null;
  firstAnimatedFrameTransformNoneWithBoxChange?: boolean | null;
};

type LayoutDebugConfig = {
  events?: LayoutDebugEvent[];
  onEvent?: (event: LayoutDebugEvent) => void;
  console?: boolean;
  panel?: boolean;
  maxEvents?: number;
};

declare global {
  interface Window {
    __MOTION_SOLID_LAYOUT_DEBUG__?: boolean | LayoutDebugConfig;
    __MOTION_SOLID_LAYOUT_DUMP__?: (filter?: string) => string;
    __MOTION_SOLID_LAYOUT_COPY__?: (filter?: string) => Promise<string>;
    __MOTION_SOLID_LAYOUT_CLEAR__?: () => void;
  }
}

const getLayoutDebugMode = () => {
  if (typeof window === "undefined") return undefined;

  try {
    const fromQuery = new URLSearchParams(window.location.search).get(
      "motion-solid-layout-debug",
    );
    if (fromQuery) return fromQuery;

    return (
      window.localStorage.getItem("motion-solid-layout-debug") ?? undefined
    );
  } catch {
    return undefined;
  }
};

const layoutDebugMatchesFilter = (
  event: LayoutDebugEvent,
  filter: string | undefined,
) => {
  if (!filter) return true;

  const loweredFilter = filter.toLowerCase();
  const values = [
    event.debugId,
    event.testId,
    event.layoutId,
    event.phase,
  ].filter((value): value is string => Boolean(value));

  return values.some((value) => value.toLowerCase().includes(loweredFilter));
};

const createLayoutDebugDump = (config: LayoutDebugConfig, filter?: string) => {
  const events = (config.events ?? []).filter((event) =>
    layoutDebugMatchesFilter(event, filter),
  );

  return JSON.stringify(
    {
      filter: filter ?? null,
      count: events.length,
      events,
    },
    null,
    2,
  );
};

const ensureLayoutDebugHelpers = (config: LayoutDebugConfig) => {
  if (typeof window === "undefined") return;

  window.__MOTION_SOLID_LAYOUT_DUMP__ = (filter?: string) =>
    createLayoutDebugDump(config, filter);
  window.__MOTION_SOLID_LAYOUT_COPY__ = async (filter?: string) => {
    const output = createLayoutDebugDump(config, filter);
    await navigator.clipboard.writeText(output);
    return output;
  };
  window.__MOTION_SOLID_LAYOUT_CLEAR__ = () => {
    config.events?.splice(0, config.events.length);
  };
};

const getLayoutDebugConfig = () => {
  if (typeof window === "undefined") return undefined;
  const existing = window.__MOTION_SOLID_LAYOUT_DEBUG__;
  if (existing) return existing;

  const debugMode = getLayoutDebugMode();
  if (!debugMode) return undefined;

  const config: LayoutDebugConfig = {
    events: [],
    console: false,
    panel: debugMode === "panel",
    maxEvents: 200,
  };

  window.__MOTION_SOLID_LAYOUT_DEBUG__ = config;
  ensureLayoutDebugHelpers(config);
  return config;
};

const ensureLayoutDebugPanel = (config: LayoutDebugConfig) => {
  if (typeof document === "undefined" || config.panel === false) return;

  let panel = document.getElementById("motion-solid-layout-debug-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "motion-solid-layout-debug-panel";
    panel.setAttribute(
      "style",
      [
        "position:fixed",
        "right:12px",
        "bottom:12px",
        "z-index:2147483647",
        "width:min(560px, calc(100vw - 24px))",
        "background:rgba(15,23,42,0.96)",
        "color:#e5e7eb",
        "border:1px solid rgba(148,163,184,0.35)",
        "border-radius:12px",
        "box-shadow:0 20px 40px rgba(0,0,0,0.35)",
        "font:12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace",
      ].join(";"),
    );

    const header = document.createElement("div");
    header.setAttribute(
      "style",
      "display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(148,163,184,0.2)",
    );

    const title = document.createElement("div");
    title.textContent = "motion-solid layout debug";
    title.setAttribute(
      "style",
      "font-weight:600;text-transform:lowercase;letter-spacing:0.02em",
    );
    header.append(title);

    const actions = document.createElement("div");
    actions.setAttribute("style", "display:flex;gap:6px");

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy";
    copyButton.setAttribute(
      "style",
      "border:1px solid rgba(148,163,184,0.35);background:#111827;color:#e5e7eb;border-radius:8px;padding:4px 8px;cursor:pointer",
    );
    copyButton.addEventListener("click", async () => {
      const textarea = document.getElementById(
        "motion-solid-layout-debug-output",
      ) as HTMLTextAreaElement | null;
      if (!textarea) return;
      textarea.select();
      try {
        await navigator.clipboard.writeText(textarea.value);
      } catch {
        document.execCommand("copy");
      }
    });
    actions.append(copyButton);

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Clear";
    clearButton.setAttribute(
      "style",
      "border:1px solid rgba(148,163,184,0.35);background:#111827;color:#e5e7eb;border-radius:8px;padding:4px 8px;cursor:pointer",
    );
    clearButton.addEventListener("click", () => {
      config.events?.splice(0, config.events.length);
      updateLayoutDebugPanel(config);
    });
    actions.append(clearButton);

    header.append(actions);
    panel.append(header);

    const hint = document.createElement("div");
    hint.textContent =
      "Right-click the log to copy, or use Copy. Without the panel, use window.__MOTION_SOLID_LAYOUT_COPY__('reshuffle').";
    hint.setAttribute(
      "style",
      "padding:8px 10px 0;color:#94a3b8;font-size:11px",
    );
    panel.append(hint);

    const textarea = document.createElement("textarea");
    textarea.id = "motion-solid-layout-debug-output";
    textarea.readOnly = true;
    textarea.setAttribute(
      "style",
      "display:block;width:calc(100% - 20px);height:260px;margin:8px 10px 10px;padding:10px;background:#020617;color:#e2e8f0;border:1px solid rgba(148,163,184,0.2);border-radius:8px;resize:vertical;white-space:pre;overflow:auto",
    );
    panel.append(textarea);

    document.body.append(panel);
  }

  updateLayoutDebugPanel(config);
};

const updateLayoutDebugPanel = (config: LayoutDebugConfig) => {
  if (typeof document === "undefined" || config.panel === false) return;

  const textarea = document.getElementById(
    "motion-solid-layout-debug-output",
  ) as HTMLTextAreaElement | null;
  if (!textarea) return;

  const events = config.events ?? [];
  const output = {
    note: "Filter for reshuffle-row / reshuffle-detail / layoutId in your editor if needed.",
    count: events.length,
    events: events.slice(-80),
  };

  textarea.value = JSON.stringify(output, null, 2);
};

const isLayoutDebugEnabled = () => Boolean(getLayoutDebugConfig());

const emitLayoutDebugEvent = (event: Omit<LayoutDebugEvent, "time">) => {
  const config = getLayoutDebugConfig();
  if (!config) return;

  const fullEvent: LayoutDebugEvent = {
    ...event,
    time: typeof performance !== "undefined" ? performance.now() : Date.now(),
  };

  if (config === true) {
    console.debug("[motion-solid][layout]", fullEvent);
    return;
  }

  ensureLayoutDebugHelpers(config);

  if (config.panel !== false) {
    ensureLayoutDebugPanel(config);
  }

  if (config.events) {
    config.events.push(fullEvent);
    const maxEvents = config.maxEvents ?? 200;
    if (config.events.length > maxEvents) {
      config.events.splice(0, config.events.length - maxEvents);
    }
  }
  config.onEvent?.(fullEvent);

  if (config.console) {
    console.debug("[motion-solid][layout]", fullEvent);
  }

  if (config.panel !== false) {
    updateLayoutDebugPanel(config);
  }
};

const toLayoutDebugRect = (
  element: Element | null | undefined,
): LayoutDebugRect | null => {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

const toLayoutDebugRectFromBox = (
  box:
    | {
        x: { min: number; max: number };
        y: { min: number; max: number };
      }
    | undefined,
): LayoutDebugRect | null => {
  if (!box) return null;

  return {
    top: box.y.min,
    left: box.x.min,
    width: box.x.max - box.x.min,
    height: box.y.max - box.y.min,
  };
};

const hasLayoutDebugBoxChanged = (
  beforeRect: LayoutDebugRect,
  afterRect: LayoutDebugRect,
) => {
  const threshold = 0.5;

  return (
    Math.abs(beforeRect.top - afterRect.top) > threshold ||
    Math.abs(beforeRect.left - afterRect.left) > threshold ||
    Math.abs(beforeRect.width - afterRect.width) > threshold ||
    Math.abs(beforeRect.height - afterRect.height) > threshold
  );
};

const getProjectionLayoutId = (projection: IProjectionNode | undefined) => {
  const projectionOptions = projection?.options as { layoutId?: string };
  return projectionOptions?.layoutId ?? null;
};

const getProjectionTestId = (element: Element | null | undefined) =>
  element?.getAttribute("data-testid") ?? null;

const getProjectionDebugId = (element: Element | null | undefined) =>
  element?.getAttribute("data-motion-debug-id") ?? null;

const canMeasureProjectionInstance = (node: IProjectionNode | undefined) => {
  if (!node?.instance) return false;
  if (typeof Element === "undefined") return true;
  return node.instance instanceof Element && node.instance.isConnected;
};

const getScrollDebugState = () => ({
  scrollX: typeof window === "undefined" ? 0 : window.scrollX,
  scrollY: typeof window === "undefined" ? 0 : window.scrollY,
});

const getProjectionDebugState = (projection: IProjectionNode | undefined) => ({
  snapshotRect: toLayoutDebugRectFromBox(projection?.snapshot?.layoutBox),
  layoutRect: toLayoutDebugRectFromBox(projection?.layout?.layoutBox),
  targetRect: toLayoutDebugRectFromBox(projection?.target),
  isLead: projection?.isLead() ?? false,
  isLayoutDirty: projection?.isLayoutDirty ?? false,
  hasCurrentAnimation: Boolean(projection?.currentAnimation),
});

const refreshSharedLayoutSnapshotFromResumeSource = (
  projection: IProjectionNode | undefined,
) => {
  if (!projection?.options.layoutId) return false;

  const resumeFrom = projection.resumeFrom;
  if (!resumeFrom || resumeFrom === projection) return false;
  if (!canMeasureProjectionInstance(resumeFrom)) return false;

  prepareProjectionSnapshotPath(resumeFrom);
  resumeFrom.clearSnapshot();
  resumeFrom.updateSnapshot();

  if (!resumeFrom.snapshot) return false;

  projection.resumeFrom = resumeFrom;
  projection.snapshot = resumeFrom.snapshot;
  projection.snapshot.latestValues =
    resumeFrom.animationValues || resumeFrom.latestValues;

  return true;
};

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

const snapshotProjectionSubtreeFromCurrentLayout = (
  projection: IProjectionNode | undefined,
) => {
  if (!projection) return false;

  const queue = [projection];
  let hasPreparedSnapshot = false;

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    if (node.layout && !node.snapshot) {
      node.snapshot = node.layout;
      hasPreparedSnapshot = true;
    }

    if (node.layout) {
      node.isLayoutDirty = true;
    }

    queue.push(...node.children);
  }

  return hasPreparedSnapshot;
};

const getProjectionSnapshotRoot = (projection: IProjectionNode) => {
  let snapshotRoot = projection;
  let parent = projection.parent;

  while (parent) {
    const options = parent.options as {
      layout?: unknown;
      layoutId?: string;
    };

    if (!options.layout && options.layoutId === undefined) {
      break;
    }

    snapshotRoot = parent;
    parent = parent.parent;
  }

  return snapshotRoot;
};

const canBroadcastProjectionWillUpdate = (node: IProjectionNode) => {
  const options = node.options as {
    layout?: unknown;
    layoutId?: string;
  };

  if (!options.layout && options.layoutId === undefined) {
    return false;
  }

  if (typeof Element === "undefined") {
    return true;
  }

  return node.instance instanceof Element && node.instance.isConnected;
};

const prepareProjectionSnapshotPath = (node: IProjectionNode) => {
  const root = node.root ?? node;

  if (!root.isUpdating) {
    root.startUpdate();
  }

  for (const ancestor of node.path) {
    ancestor.shouldResetTransform = true;
    ancestor.updateScroll("snapshot");
  }
};

type ProjectionRootDidUpdateState = IProjectionNode & {
  __motionSolidDidUpdateSuppressed?: boolean;
  __motionSolidDidUpdateSuppressionQueued?: boolean;
};

const flushProjectionRootDidUpdate = (projection: IProjectionNode) => {
  const root = (projection.root ?? projection) as ProjectionRootDidUpdateState;

  if (root.__motionSolidDidUpdateSuppressed) {
    return false;
  }

  root.__motionSolidDidUpdateSuppressed = true;

  if (!root.__motionSolidDidUpdateSuppressionQueued) {
    root.__motionSolidDidUpdateSuppressionQueued = true;
    queueMicrotask(() => {
      queueMicrotask(() => {
        root.__motionSolidDidUpdateSuppressed = false;
        root.__motionSolidDidUpdateSuppressionQueued = false;
      });
    });
  }

  root.didUpdate();
  return true;
};

const broadcastProjectionSubtreeWillUpdate = (
  root: IProjectionNode,
  source: IProjectionNode,
) => {
  const queue = [root];
  let broadcastedNodes = 0;

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    if (node !== source && canBroadcastProjectionWillUpdate(node)) {
      prepareProjectionSnapshotPath(node);
      const rootAnimationId = node.root?.animationId;

      const needsFreshSnapshotThisCycle =
        rootAnimationId !== undefined &&
        node.snapshot?.animationId !== undefined &&
        node.snapshot.animationId !== rootAnimationId &&
        (node.isLayoutDirty || Boolean(node.currentAnimation) || !!node.target);

      if (needsFreshSnapshotThisCycle) {
        node.clearSnapshot();
        node.isLayoutDirty = false;
      }

      if (!node.isLayoutDirty) {
        node.willUpdate(false);
        broadcastedNodes += 1;
      }
    }

    queue.push(...node.children);
  }

  return broadcastedNodes;
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
      return Number.NaN;
    }

    const source = transition as Record<string, unknown>;
    const hasExplicitDuration = typeof source.duration === "number";
    const duration = hasExplicitDuration ? (source.duration as number) : 0;
    const delay = typeof source.delay === "number" ? source.delay : 0;
    const repeat = typeof source.repeat === "number" ? source.repeat : 0;
    const repeatDelay =
      typeof source.repeatDelay === "number" ? source.repeatDelay : 0;
    let max = hasExplicitDuration
      ? delay + duration * Math.max(repeat + 1, 1) + repeatDelay * repeat
      : Number.NaN;

    for (const key in source) {
      const value = source[key];
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const childDuration = readDuration(value);
      if (!Number.isFinite(childDuration)) continue;
      max = Number.isFinite(max) ? Math.max(max, childDuration) : childDuration;
    }

    return max;
  };

  const readTargetDuration = (target: unknown): number => {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      return Number.NaN;
    }

    const source = target as { transition?: unknown };
    return readDuration(source.transition);
  };

  if (Array.isArray(definition)) {
    const maxDuration = definition.reduce((max, entry) => {
      const duration = readTargetDuration(entry);
      if (!Number.isFinite(duration)) return max;
      return Number.isFinite(max) ? Math.max(max, duration) : duration;
    }, Number.NaN);

    return Number.isFinite(maxDuration) ? maxDuration * 1000 + 100 : undefined;
  }

  const duration = readTargetDuration(definition);
  return Number.isFinite(duration) ? duration * 1000 + 100 : undefined;
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
  const isIntrinsicComponent = typeof component === "string";
  const componentTag = isIntrinsicComponent ? component : isSVG ? "svg" : "div";
  const MotionComponent = (props: MotionPropsInternal<Tag>) => {
    const parentContext = useMotionContext();
    const layoutGroup = useLayoutGroupContext();
    const switchLayoutGroup = useSwitchLayoutGroupContext();
    const motionConfig = useMotionConfig();
    const presence = usePresenceContext();
    const presenceId = createUniqueId();
    let currentElement: ElementInstance<Tag> | null = null;
    let childListObserver: MutationObserver | undefined;
    let isSyncingChildListLayout = false;
    let hasScheduledChildListSync = false;
    const [childRenderVersion, setChildRenderVersion] = createSignal(0);
    const [latestDidUpdateId, setLatestDidUpdateId] = createSignal(0);
    const [hasMounted, setHasMounted] = createSignal(false);
    let canTrackChildRenderChanges = false;
    let isCleaningUp = false;
    let animationChangesId = 0;
    let hasScheduledInitialAnimation = false;
    let scheduledInitialAnimationFrame: number | null = null;
    let clearChildListRecoverySuppressionFrame: number | null = null;
    let clearChildRenderMeasurementSuppressionFrame: number | null = null;
    let hasTakenAnySnapshot = false;
    let hasCommittedProjectionMount = false;
    let groupProjection: IProjectionNode | undefined;
    let switchProjection: IProjectionNode | undefined;
    let removeProjectionAnimationStartListener: VoidFunction | undefined;
    let removeProjectionAnimationCompleteListener: VoidFunction | undefined;
    let debugRectBeforeMutation: LayoutDebugRect | null = null;
    let debugDidRunWillUpdate = false;
    let debugRecoveredByMutationObserver = false;
    let debugMeasurementReasons: string[] = [];
    let debugRefreshedResumeSnapshot = false;
    let hasPendingProjectionMeasurement = false;
    let suppressChildListRecovery = false;
    let suppressChildRenderMeasurement = false;
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

    const scheduleProjectionMeasurement = (
      measurementReasons: string[],
      options: {
        includeSubtreeBroadcast?: boolean;
        suppressNextChildRenderMeasurement?: boolean;
        promotePresenceChanges?: boolean;
      } = {},
    ) => {
      const projection = visualElement.projection;
      if (!hasMounted() || !projection) return false;

      const element = currentElement as Element | null;
      if (
        typeof Element !== "undefined" &&
        (!element || !element.isConnected)
      ) {
        return false;
      }

      const isExplicitForceRender = measurementReasons.includes(
        "layoutGroup:forceRender",
      );

      if (
        hasPendingProjectionMeasurement &&
        projection.root?.isUpdating &&
        !isExplicitForceRender
      ) {
        debugMeasurementReasons = Array.from(
          new Set([...debugMeasurementReasons, ...measurementReasons]),
        );
        return true;
      }

      hasPendingProjectionMeasurement = true;
      hasTakenAnySnapshot = true;
      debugRectBeforeMutation = toLayoutDebugRect(element);
      debugDidRunWillUpdate = true;
      debugRecoveredByMutationObserver = false;

      if (options.suppressNextChildRenderMeasurement) {
        suppressChildRenderMeasurement = true;
        if (clearChildRenderMeasurementSuppressionFrame !== null) {
          cancelAnimationFrame(clearChildRenderMeasurementSuppressionFrame);
        }
        clearChildRenderMeasurementSuppressionFrame = requestAnimationFrame(
          () => {
            clearChildRenderMeasurementSuppressionFrame = null;
            suppressChildRenderMeasurement = false;
          },
        );
      }

      suppressChildListRecovery = true;
      if (clearChildListRecoverySuppressionFrame !== null) {
        cancelAnimationFrame(clearChildListRecoverySuppressionFrame);
      }
      clearChildListRecoverySuppressionFrame = requestAnimationFrame(() => {
        clearChildListRecoverySuppressionFrame = null;
        suppressChildListRecovery = false;
      });
      debugRefreshedResumeSnapshot =
        refreshSharedLayoutSnapshotFromResumeSource(projection) ||
        debugRefreshedResumeSnapshot;

      projection.willUpdate();

      let broadcastedNodes = 0;
      if (options.includeSubtreeBroadcast) {
        const subtreeRoot = getProjectionSnapshotRoot(
          projection.parent ?? projection,
        );

        broadcastedNodes = broadcastProjectionSubtreeWillUpdate(
          subtreeRoot,
          projection,
        );
      }

      debugMeasurementReasons =
        broadcastedNodes > 0
          ? [...measurementReasons, "children:broadcast"]
          : measurementReasons;

      emitLayoutDebugEvent({
        phase: "willUpdate",
        projectionId: projection.id,
        layoutId: getProjectionLayoutId(projection),
        testId: getProjectionTestId(element),
        debugId: getProjectionDebugId(element),
        rectBeforeMutation: debugRectBeforeMutation,
        ...getProjectionDebugState(projection),
        ...getScrollDebugState(),
        refreshedResumeSnapshot: debugRefreshedResumeSnapshot,
        didRunWillUpdate: true,
        recoveredByMutationObserver: false,
        mutationRecoveryOnly: false,
        measurementReasons: debugMeasurementReasons,
        broadcastedNodes,
      });

      if (
        options.promotePresenceChanges &&
        measurementReasons.includes("presence:changed")
      ) {
        if (isPresent()) {
          projection.promote();
        } else if (!projection.relegate()) {
          frame.postRender(() => {
            const stack = projection.getStack();
            if (!stack || !stack.members.length) {
              presence?.onExitComplete(presenceId, currentElement ?? undefined);
            }
          });
        }
      }

      setLatestDidUpdateId((value: number) => value + 1);
      return true;
    };

    const notifyParentLayoutWillChange = (reason: string) => {
      parentContext.onChildLayoutWillChange?.(reason);
    };

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
                onAnimationStart(definition);
              }
            : undefined,
        onAnimationComplete:
          typeof onAnimationComplete === "function"
            ? (definition: MotionAnimationDefinition) => {
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
    notifyParentLayoutWillChange("children:descendant-mount");

    createComputed<
      | {
          layoutDependency: unknown;
          isPresent: boolean;
          forceRenderVersion: number;
          childRenderVersion: number;
        }
      | undefined
    >((prev) => {
      const props = resolvedMotionOptions();
      const currentIsPresent = isPresent();
      const forceRenderVersion = layoutGroup.forceRenderVersion?.() ?? 0;
      const nextChildRenderVersion = childRenderVersion();

      local.class;
      local.classList;
      local.textContent;
      local.innerHTML;
      props.style;

      if (!hasMounted() || !visualElement.projection) {
        return {
          layoutDependency: props.layoutDependency,
          isPresent: currentIsPresent,
          forceRenderVersion,
          childRenderVersion: nextChildRenderVersion,
        };
      }

      visualElement.projection.isPresent = currentIsPresent;

      // Keep the previous projection options through the snapshot phase so
      // interrupted shared-layout promotions can still resume from the lead
      // that is animating out of the previous state.

      const hasUndefinedLayoutDependency = props.layoutDependency === undefined;
      const hasLayoutDependencyChange =
        prev?.layoutDependency !== props.layoutDependency;
      const hasPresenceChange = prev?.isPresent !== currentIsPresent;
      const hasForceRenderVersionChange =
        prev?.forceRenderVersion !== forceRenderVersion;
      const hasChildRenderChange =
        prev?.childRenderVersion !== nextChildRenderVersion;
      const measurementReasons: string[] = [];

      if (hasUndefinedLayoutDependency) {
        measurementReasons.push("layoutDependency:undefined");
      }

      if (hasLayoutDependencyChange) {
        measurementReasons.push("layoutDependency:changed");
      }

      if (hasPresenceChange) {
        measurementReasons.push("presence:changed");
      }

      if (hasForceRenderVersionChange) {
        measurementReasons.push("layoutGroup:forceRender");
      }

      if (hasChildRenderChange) {
        measurementReasons.push("children:changed");
      }

      const shouldMeasure = measurementReasons.length > 0;
      const shouldSkipChildRenderFollowUpMeasurement =
        suppressChildRenderMeasurement &&
        hasChildRenderChange &&
        !hasLayoutDependencyChange &&
        !hasPresenceChange &&
        !hasForceRenderVersionChange;

      if (shouldMeasure && !shouldSkipChildRenderFollowUpMeasurement) {
        scheduleProjectionMeasurement(measurementReasons, {
          includeSubtreeBroadcast:
            hasChildRenderChange ||
            hasLayoutDependencyChange ||
            hasPresenceChange ||
            hasForceRenderVersionChange,
          promotePresenceChanges: true,
        });
      }

      return {
        layoutDependency: props.layoutDependency,
        isPresent: currentIsPresent,
        forceRenderVersion,
        childRenderVersion: nextChildRenderVersion,
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

    const MotionHostChildren: Component = () => {
      const resolvedChildren = createMemo(() => {
        const value = local.children;
        return isMotionValue(value) ? value.get() : value;
      });
      const resolvedChildElements = resolveElements(resolvedChildren).toArray;

      createComputed(() => {
        resolvedChildElements();
        if (!canTrackChildRenderChanges) return;
        setChildRenderVersion((value) => value + 1);
      });

      return resolvedChildren() as JSX.Element;
    };

    const renderMotionChildren = () => {
      if (local.textContent !== undefined || local.innerHTML !== undefined) {
        return undefined;
      }

      return (
        <MotionContext.Provider
          value={{
            ...treeVariants(),
            visualElement,
            onChildLayoutWillChange: (reason) => {
              scheduleProjectionMeasurement([reason], {
                includeSubtreeBroadcast: true,
                suppressNextChildRenderMeasurement: true,
              });
            },
          }}
        >
          <MotionHostChildren />
        </MotionContext.Provider>
      );
    };

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
          visualElement.updateFeatures();
          visualElement.scheduleRenderMicrotask();
        }
      },
    );

    onMount(() => {
      setHasMounted(true);
      canTrackChildRenderChanges = true;
    });

    createRenderEffect(() => {
      const props = resolvedMotionOptions();
      const mounted = hasMounted();

      ensureProjectionNode(props);
      updateProjectionOptions(props);

      visualElement.update(
        props as unknown as MotionNodeOptions,
        motionDomPresenceContext(),
      );

      const projection = visualElement.projection;
      debugRefreshedResumeSnapshot =
        refreshSharedLayoutSnapshotFromResumeSource(projection) ||
        debugRefreshedResumeSnapshot;

      if (projection && layoutGroup.group && groupProjection !== projection) {
        layoutGroup.group.add(projection);
        groupProjection = projection;
      }

      if (
        projection &&
        switchLayoutGroup.register &&
        props.layoutId &&
        switchProjection !== projection
      ) {
        switchLayoutGroup.register(projection);
        switchProjection = projection;
      }

      if (projection && !hasCommittedProjectionMount) {
        hasCommittedProjectionMount = true;

        if (hasTakenAnySnapshot) {
          flushProjectionRootDidUpdate(projection);
        }
      }

      if (projection && removeProjectionAnimationStartListener === undefined) {
        removeProjectionAnimationStartListener = projection.addEventListener(
          "animationStart",
          (() => {
            emitLayoutDebugEvent({
              phase: "animationStart",
              projectionId: projection.id,
              layoutId: getProjectionLayoutId(projection),
              testId: getProjectionTestId(currentElement as Element | null),
              debugId: getProjectionDebugId(currentElement as Element | null),
              rectBeforeMutation: toLayoutDebugRect(
                currentElement as Element | null,
              ),
              ...getProjectionDebugState(projection),
              ...getScrollDebugState(),
              refreshedResumeSnapshot: debugRefreshedResumeSnapshot,
              didRunWillUpdate: debugDidRunWillUpdate,
              recoveredByMutationObserver: debugRecoveredByMutationObserver,
              mutationRecoveryOnly:
                !debugDidRunWillUpdate && debugRecoveredByMutationObserver,
              measurementReasons: debugMeasurementReasons,
            });
          }) as never,
        );
      }

      if (
        projection &&
        removeProjectionAnimationCompleteListener === undefined
      ) {
        removeProjectionAnimationCompleteListener = projection.addEventListener(
          "animationComplete",
          (() => {
            emitLayoutDebugEvent({
              phase: "animationComplete",
              projectionId: projection.id,
              layoutId: getProjectionLayoutId(projection),
              testId: getProjectionTestId(currentElement as Element | null),
              debugId: getProjectionDebugId(currentElement as Element | null),
              rectBeforeMutation: toLayoutDebugRect(
                currentElement as Element | null,
              ),
              ...getProjectionDebugState(projection),
              ...getScrollDebugState(),
              refreshedResumeSnapshot: debugRefreshedResumeSnapshot,
              didRunWillUpdate: debugDidRunWillUpdate,
              recoveredByMutationObserver: debugRecoveredByMutationObserver,
              mutationRecoveryOnly:
                !debugDidRunWillUpdate && debugRecoveredByMutationObserver,
              measurementReasons: debugMeasurementReasons,
            });
            if (!isPresent()) {
              presence?.onExitComplete(presenceId, currentElement ?? undefined);
            }
          }) as never,
        );
      }

      if (mounted) {
        visualElement.updateFeatures();
        visualElement.scheduleRenderMicrotask();
      }
    });

    createRenderEffect(() => {
      childListObserver?.disconnect();
      childListObserver = undefined;

      if (typeof MutationObserver === "undefined") return;
      if (!hasMounted()) return;
      if (!visualElement.projection || !currentElement) return;

      childListObserver = new MutationObserver((records) => {
        if (isCleaningUp || isSyncingChildListLayout) return;

        const hasChildListMutation = records.some(
          (record) =>
            record.type === "childList" &&
            (record.addedNodes.length > 0 || record.removedNodes.length > 0),
        );

        if (!hasChildListMutation || hasScheduledChildListSync) return;

        hasScheduledChildListSync = true;

        queueMicrotask(() => {
          hasScheduledChildListSync = false;

          if (isCleaningUp || isSyncingChildListLayout) return;
          if (suppressChildListRecovery) return;

          const currentProjection = visualElement.projection;
          if (!currentProjection || !currentElement?.isConnected) return;

          const projection = getProjectionSnapshotRoot(currentProjection);
          const root = projection.root;
          if (!root || root.isUpdateBlocked()) return;

          if (
            debugDidRunWillUpdate ||
            root.isUpdating ||
            currentProjection.snapshot
          ) {
            return;
          }

          const hasSnapshot =
            snapshotProjectionSubtreeFromCurrentLayout(projection);
          if (!hasSnapshot) return;

          if (!debugRectBeforeMutation) {
            debugRectBeforeMutation = toLayoutDebugRect(
              currentElement as Element | null,
            );
          }

          debugRecoveredByMutationObserver = true;

          if (!debugDidRunWillUpdate) {
            debugMeasurementReasons = ["mutation-observer"];
          }

          emitLayoutDebugEvent({
            phase: "mutationRecovery",
            projectionId: currentProjection.id,
            layoutId: getProjectionLayoutId(currentProjection),
            testId: getProjectionTestId(currentElement as Element | null),
            debugId: getProjectionDebugId(currentElement as Element | null),
            rectBeforeMutation: debugRectBeforeMutation,
            ...getProjectionDebugState(currentProjection),
            ...getScrollDebugState(),
            refreshedResumeSnapshot: debugRefreshedResumeSnapshot,
            didRunWillUpdate: debugDidRunWillUpdate,
            recoveredByMutationObserver: true,
            mutationRecoveryOnly:
              !debugDidRunWillUpdate && debugRecoveredByMutationObserver,
            measurementReasons: debugMeasurementReasons,
            mutationRecordCount: records.length,
          });

          isSyncingChildListLayout = true;
          hasTakenAnySnapshot = true;

          root.startUpdate();
          setLatestDidUpdateId((value) => value + 1);

          queueMicrotask(() => {
            isSyncingChildListLayout = false;
          });
        });
      });

      childListObserver.observe(currentElement, { childList: true });
    });

    createEffect(() => {
      if (!hasMounted()) return;

      resolvedMotionOptions();
      const currentIsPresent = isPresent();
      const currentAnimationChangesId = ++animationChangesId;
      const runAnimationChanges = () => {
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
      };

      if (!hasScheduledInitialAnimation) {
        hasScheduledInitialAnimation = true;

        if (scheduledInitialAnimationFrame !== null) {
          cancelAnimationFrame(scheduledInitialAnimationFrame);
        }

        scheduledInitialAnimationFrame = requestAnimationFrame(() => {
          scheduledInitialAnimationFrame = null;
          runAnimationChanges();
        });

        return;
      }

      queueMicrotask(() => {
        runAnimationChanges();
      });
    });

    createEffect(() => {
      const didUpdateId = latestDidUpdateId();
      if (!didUpdateId || !visualElement.projection) return;

      if (didUpdateId !== latestDidUpdateId()) return;

      if (hasTakenAnySnapshot) {
        const projection = visualElement.projection;
        const didRunWillUpdate = debugDidRunWillUpdate;
        const recoveredByMutationObserver = debugRecoveredByMutationObserver;
        const measurementReasons = debugMeasurementReasons;
        const refreshedResumeSnapshot = debugRefreshedResumeSnapshot;
        const rectBeforeMutation = debugRectBeforeMutation;

        emitLayoutDebugEvent({
          phase: "didUpdate",
          projectionId: projection.id,
          layoutId: getProjectionLayoutId(projection),
          testId: getProjectionTestId(currentElement as Element | null),
          debugId: getProjectionDebugId(currentElement as Element | null),
          rectBeforeMutation,
          ...getProjectionDebugState(projection),
          ...getScrollDebugState(),
          refreshedResumeSnapshot,
          didRunWillUpdate,
          recoveredByMutationObserver,
          mutationRecoveryOnly:
            !didRunWillUpdate && recoveredByMutationObserver,
          measurementReasons,
        });

        flushProjectionRootDidUpdate(projection);

        if (
          isLayoutDebugEnabled() &&
          rectBeforeMutation &&
          currentElement instanceof Element
        ) {
          const trackedElement = currentElement;
          const trackedProjectionId = projection.id;
          const trackedLayoutId = getProjectionLayoutId(projection);

          requestAnimationFrame(() => {
            if (isCleaningUp || !trackedElement.isConnected) return;

            const transform = getComputedStyle(trackedElement).transform;
            const nextRect = toLayoutDebugRect(trackedElement);
            const boxChanged =
              nextRect === null
                ? null
                : hasLayoutDebugBoxChanged(rectBeforeMutation, nextRect);

            emitLayoutDebugEvent({
              phase: "firstAnimatedFrame",
              projectionId: trackedProjectionId,
              layoutId: trackedLayoutId,
              testId: getProjectionTestId(trackedElement),
              debugId: getProjectionDebugId(trackedElement),
              rectBeforeMutation,
              afterRect: nextRect,
              ...getProjectionDebugState(visualElement.projection),
              ...getScrollDebugState(),
              refreshedResumeSnapshot,
              didRunWillUpdate,
              recoveredByMutationObserver,
              mutationRecoveryOnly:
                !didRunWillUpdate && recoveredByMutationObserver,
              measurementReasons,
              transform,
              boxChanged,
              firstAnimatedFrameTransformNoneWithBoxChange:
                boxChanged === null ? null : boxChanged && transform === "none",
            });
          });
        }

        debugDidRunWillUpdate = false;
        debugRecoveredByMutationObserver = false;
        debugMeasurementReasons = [];
        debugRefreshedResumeSnapshot = false;
        debugRectBeforeMutation = null;
        hasPendingProjectionMeasurement = false;
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

    const renderHost = (): JSX.Element => {
      return (
        <Dynamic
          component={component as ValidComponent}
          {...visualProps()}
          ref={ref}
        >
          {renderMotionChildren()}
        </Dynamic>
      );
    };

    onCleanup(() => {
      notifyParentLayoutWillChange("children:descendant-unmount");
      isCleaningUp = true;
      hasPendingProjectionMeasurement = false;
      childListObserver?.disconnect();
      childListObserver = undefined;
      removeProjectionAnimationStartListener?.();
      removeProjectionAnimationStartListener = undefined;
      removeProjectionAnimationCompleteListener?.();
      removeProjectionAnimationCompleteListener = undefined;
      animationChangesId++;
      if (scheduledInitialAnimationFrame !== null) {
        cancelAnimationFrame(scheduledInitialAnimationFrame);
        scheduledInitialAnimationFrame = null;
      }
      if (clearChildListRecoverySuppressionFrame !== null) {
        cancelAnimationFrame(clearChildListRecoverySuppressionFrame);
        clearChildListRecoverySuppressionFrame = null;
      }
      if (clearChildRenderMeasurementSuppressionFrame !== null) {
        cancelAnimationFrame(clearChildRenderMeasurementSuppressionFrame);
        clearChildRenderMeasurementSuppressionFrame = null;
      }
      suppressChildListRecovery = false;
      suppressChildRenderMeasurement = false;

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

        exitTimeout = setTimeout(completeExit, exitTimeoutMs ?? 10_000);

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

    const host = renderHost();

    return host;
  };

  return MotionComponent as unknown as Component<MotionProps<Tag>>;
};
