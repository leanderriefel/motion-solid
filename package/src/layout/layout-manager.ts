import { mixNumber, motionValue } from "motion-dom";
import type {
  AnimationPlaybackControlsWithThen,
  MotionValue,
  Transition,
  ValueTransition,
} from "motion-dom";
import type { Axis, AxisDelta, Box, Delta } from "motion-utils";
import { startMotionValueAnimation } from "../animation/motion-value";

export type LayoutAnimationType =
  | boolean
  | "position"
  | "size"
  | "preserve-aspect";

type ProjectionUpdate = {
  transform?: string | null;
  opacity?: number | null;
};

type ProjectionUpdateHandler = (
  update: ProjectionUpdate,
  immediate: boolean,
) => void;

type LayoutCallbacks = {
  onBeforeLayoutMeasure?: (box: Box) => void;
  onLayoutMeasure?: (box: Box, prevBox: Box) => void;
  onLayoutAnimationStart?: () => void;
  onLayoutAnimationComplete?: () => void;
};

type LayoutNodeOptions = LayoutCallbacks & {
  layout?: LayoutAnimationType;
  layoutId?: string;
  layoutCrossfade?: boolean;
  transition?: Transition;
};

type LayoutNode = {
  element: HTMLElement | SVGElement;
  options: LayoutNodeOptions;

  prevBox: Box | null;
  latestBox: Box | null;

  delta: Delta | null;
  projectionProgress: MotionValue<number>;
  projectionAnimation: AnimationPlaybackControlsWithThen | null;

  opacity: MotionValue<number>;
  opacityAnimation: AnimationPlaybackControlsWithThen | null;
  opacityActive: boolean;

  apply: ProjectionUpdateHandler;
  render: () => void;
  scheduleRender: () => void;

  stop: () => void;
  destroy: () => void;
};

const DEFAULT_LAYOUT_TRANSITION: ValueTransition = {
  type: "spring",
  stiffness: 500,
  damping: 35,
  mass: 1,
};

const resolveLayoutTransition = (transition?: Transition): Transition => {
  if (!transition) return DEFAULT_LAYOUT_TRANSITION;

  const hasLayoutOverride =
    typeof transition === "object" &&
    transition !== null &&
    "layout" in transition &&
    (transition as { layout?: unknown }).layout !== undefined;

  if (!hasLayoutOverride) return DEFAULT_LAYOUT_TRANSITION;

  const layout = (transition as { layout?: ValueTransition }).layout;
  return layout ?? DEFAULT_LAYOUT_TRANSITION;
};

const resolveLayoutType = (
  layout: LayoutAnimationType | undefined,
  layoutId: string | undefined,
): LayoutAnimationType | undefined => {
  if (!layout && !layoutId) return undefined;
  return layout ?? true;
};

const isValidBox = (box: Box): boolean => {
  return (
    Number.isFinite(box.x.min) &&
    Number.isFinite(box.x.max) &&
    Number.isFinite(box.y.min) &&
    Number.isFinite(box.y.max)
  );
};

const boxEquals = (a: Box, b: Box, threshold = 0.5): boolean => {
  return (
    Math.abs(a.x.min - b.x.min) <= threshold &&
    Math.abs(a.x.max - b.x.max) <= threshold &&
    Math.abs(a.y.min - b.y.min) <= threshold &&
    Math.abs(a.y.max - b.y.max) <= threshold
  );
};

const calcLength = (axis: Axis): number => axis.max - axis.min;

const createAxisDelta = (): AxisDelta => ({
  translate: 0,
  scale: 1,
  origin: 0.5,
  originPoint: 0,
});

const calcAxisDelta = (
  delta: AxisDelta,
  source: Axis,
  target: Axis,
  origin = 0.5,
): void => {
  delta.origin = origin;
  delta.originPoint = mixNumber(source.min, source.max, delta.origin);

  const sourceLength = calcLength(source);
  const targetLength = calcLength(target);

  if (sourceLength === 0 || !Number.isFinite(sourceLength)) {
    delta.scale = 1;
  } else {
    delta.scale = targetLength / sourceLength;
  }

  delta.translate =
    mixNumber(target.min, target.max, delta.origin) - delta.originPoint;

  if (!Number.isFinite(delta.translate)) delta.translate = 0;
  if (!Number.isFinite(delta.scale) || delta.scale === 0) delta.scale = 1;
};

const calcBoxDelta = (source: Box, target: Box, origin = 0.5): Delta => {
  const delta: Delta = {
    x: createAxisDelta(),
    y: createAxisDelta(),
  };

  calcAxisDelta(delta.x, source.x, target.x, origin);
  calcAxisDelta(delta.y, source.y, target.y, origin);

  return delta;
};

const calcAspectRatio = (box: Box): number => {
  const width = calcLength(box.x);
  const height = calcLength(box.y);
  if (width === 0 || height === 0) return 0;
  return width / height;
};

const applyLayoutType = (
  delta: Delta,
  layout: LayoutAnimationType | undefined,
  source: Box,
  target: Box,
): void => {
  if (layout === "position") {
    delta.x.scale = 1;
    delta.y.scale = 1;
    return;
  }

  if (layout === "size") {
    delta.x.translate = 0;
    delta.y.translate = 0;
    return;
  }

  if (layout === "preserve-aspect") {
    const sourceRatio = calcAspectRatio(source);
    const targetRatio = calcAspectRatio(target);

    if (sourceRatio === 0 || targetRatio === 0) return;

    const ratioDelta =
      Math.abs(sourceRatio - targetRatio) / Math.max(sourceRatio, targetRatio);

    if (ratioDelta > 0.01) {
      delta.x.scale = 1;
      delta.y.scale = 1;
    }
  }
};

const isDeltaIdentity = (delta: Delta, threshold = 0.0001): boolean => {
  return (
    Math.abs(delta.x.translate) <= 0.5 &&
    Math.abs(delta.y.translate) <= 0.5 &&
    Math.abs(delta.x.scale - 1) <= threshold &&
    Math.abs(delta.y.scale - 1) <= threshold
  );
};

const buildProjectionTransform = (
  delta: Delta,
  progress: number,
): string | null => {
  const p = Math.min(1, Math.max(0, progress));

  const translateX = mixNumber(delta.x.translate, 0, p);
  const translateY = mixNumber(delta.y.translate, 0, p);
  const scaleX = mixNumber(delta.x.scale, 1, p);
  const scaleY = mixNumber(delta.y.scale, 1, p);

  const isIdentity =
    Math.abs(translateX) <= 0.5 &&
    Math.abs(translateY) <= 0.5 &&
    Math.abs(scaleX - 1) <= 0.0001 &&
    Math.abs(scaleY - 1) <= 0.0001;

  if (isIdentity) return null;

  return `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
};

const measurePageBox = (element: Element): Box => {
  const rect = element.getBoundingClientRect();
  const scrollX = typeof window === "undefined" ? 0 : window.scrollX;
  const scrollY = typeof window === "undefined" ? 0 : window.scrollY;

  return {
    x: {
      min: rect.left + scrollX,
      max: rect.right + scrollX,
    },
    y: {
      min: rect.top + scrollY,
      max: rect.bottom + scrollY,
    },
  };
};

class LayoutIdStack {
  private lead: LayoutNode | null = null;
  private prevLead: LayoutNode | null = null;
  private snapshot: Box | null = null;
  private members = new Set<LayoutNode>();

  add(node: LayoutNode): void {
    this.members.add(node);

    const prevLead = this.lead;
    if (prevLead && prevLead !== node) {
      this.prevLead = prevLead;
      this.lead = node;
      this.snapshot = prevLead.latestBox ?? prevLead.prevBox ?? this.snapshot;

      if (this.snapshot) {
        node.prevBox = this.snapshot;
      }

      const shouldCrossfadeNew = node.options.layoutCrossfade !== false;
      const shouldCrossfadePrev = prevLead.options.layoutCrossfade !== false;

      if (shouldCrossfadeNew) {
        node.opacityActive = true;
        node.opacity.set(0);
        node.apply({ opacity: 0 }, false);
      }

      if (shouldCrossfadePrev) {
        prevLead.opacityActive = true;
        prevLead.opacity.set(1);
        prevLead.apply({ opacity: 1 }, false);
      }

      if (shouldCrossfadeNew || shouldCrossfadePrev) {
        const transition = resolveLayoutTransition(node.options.transition);

        if (shouldCrossfadeNew) {
          node.opacityAnimation?.stop();
          node.opacityAnimation =
            startMotionValueAnimation({
              name: "opacity",
              motionValue: node.opacity,
              keyframes: 1,
              transition,
            }) ?? null;

          node.opacityAnimation?.finished.then(() => {
            node.opacityActive = false;
            node.apply({ opacity: null }, false);
          });
        }

        if (shouldCrossfadePrev) {
          prevLead.opacityAnimation?.stop();
          prevLead.opacityAnimation =
            startMotionValueAnimation({
              name: "opacity",
              motionValue: prevLead.opacity,
              keyframes: 0,
              transition,
            }) ?? null;

          prevLead.opacityAnimation?.finished.then(() => {
            prevLead.opacityActive = false;
            prevLead.apply({ opacity: null }, false);
          });
        }
      }

      return;
    }

    this.lead = node;

    if (this.snapshot) {
      node.prevBox = this.snapshot;
    }
  }

  remove(node: LayoutNode): void {
    this.members.delete(node);

    if (this.lead === node) {
      this.snapshot = node.latestBox ?? node.prevBox ?? this.snapshot;
      this.lead = null;
      this.prevLead = null;
      return;
    }

    if (this.prevLead === node) {
      this.prevLead = null;
    }
  }

  isEmpty(): boolean {
    return this.members.size === 0;
  }

  hasSnapshot(): boolean {
    return this.snapshot !== null;
  }
}

class LayoutManager {
  private nodes = new Set<LayoutNode>();
  private nodeByElement = new WeakMap<Element, LayoutNode>();
  private stacks = new Map<string, LayoutIdStack>();

  private scheduled = false;
  private isFlushing = false;

  private removeWindowListeners: VoidFunction | null = null;
  private mutationObserver: MutationObserver | null = null;

  register(node: LayoutNode): void {
    this.nodes.add(node);
    this.nodeByElement.set(node.element, node);

    if (node.options.layoutId) {
      this.getStack(node.options.layoutId).add(node);
    }

    this.ensureObservers();
    this.scheduleUpdate();
  }

  unregister(node: LayoutNode): void {
    this.nodes.delete(node);
    this.nodeByElement.delete(node.element);

    if (node.options.layoutId) {
      const stack = this.stacks.get(node.options.layoutId);
      stack?.remove(node);
      if (stack?.isEmpty() && !stack.hasSnapshot()) {
        this.stacks.delete(node.options.layoutId);
      }
    }

    if (this.nodes.size === 0) this.cleanupObservers();

    node.destroy();
    this.scheduleUpdate();
  }

  updateNodeOptions(node: LayoutNode, options: LayoutNodeOptions): void {
    const prevLayoutId = node.options.layoutId;
    node.options = options;

    if (prevLayoutId !== options.layoutId) {
      if (prevLayoutId) {
        const prevStack = this.stacks.get(prevLayoutId);
        prevStack?.remove(node);
        if (prevStack?.isEmpty() && !prevStack.hasSnapshot()) {
          this.stacks.delete(prevLayoutId);
        }
      }

      if (options.layoutId) {
        this.getStack(options.layoutId).add(node);
      }

      this.scheduleUpdate();
    }
  }

  scheduleUpdate(): void {
    if (typeof window === "undefined") return;
    if (this.scheduled) return;

    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.flush();
    });
  }

  flush(): void {
    if (typeof window === "undefined") return;
    if (this.isFlushing) return;

    this.isFlushing = true;

    const nodes = Array.from(this.nodes);

    // Notify before measure using last snapshot.
    for (const node of nodes) {
      const prevBox = node.prevBox;
      if (prevBox) node.options.onBeforeLayoutMeasure?.(prevBox);
    }

    // Remove transforms to measure transform-free layouts.
    const previousTransforms: Array<[Element, string]> = [];
    for (const node of nodes) {
      const el = node.element;
      previousTransforms.push([el, el.style.transform]);
      el.style.transform = "none";
    }

    const measurements = new Map<LayoutNode, Box>();
    for (const node of nodes) {
      measurements.set(node, measurePageBox(node.element));
    }

    // Restore transforms.
    for (const [el, transform] of previousTransforms) {
      (el as HTMLElement | SVGElement).style.transform = transform;
    }

    for (const node of nodes) {
      const box = measurements.get(node);
      if (!box) continue;
      if (!isValidBox(box)) continue;

      const prevBox = node.prevBox ?? null;
      node.latestBox = box;

      node.options.onLayoutMeasure?.(box, prevBox ?? box);

      const layoutType = resolveLayoutType(
        node.options.layout,
        node.options.layoutId,
      );
      if (!layoutType) {
        node.prevBox = box;
        continue;
      }

      if (!prevBox) {
        node.prevBox = box;
        continue;
      }

      if (boxEquals(prevBox, box)) {
        node.prevBox = box;
        continue;
      }

      const delta = calcBoxDelta(box, prevBox);
      applyLayoutType(delta, layoutType, box, prevBox);

      if (isDeltaIdentity(delta)) {
        node.prevBox = box;
        continue;
      }

      this.startLayoutAnimation(
        node,
        delta,
        resolveLayoutTransition(node.options.transition),
      );
      node.prevBox = box;
    }

    this.isFlushing = false;
  }

  private startLayoutAnimation(
    node: LayoutNode,
    delta: Delta,
    transition: Transition,
  ): void {
    node.delta = delta;

    node.projectionAnimation?.stop();
    node.projectionProgress.stop();
    node.projectionProgress.set(0);

    const initialTransform = buildProjectionTransform(delta, 0);
    node.apply({ transform: initialTransform }, true);

    node.options.onLayoutAnimationStart?.();

    node.projectionAnimation =
      startMotionValueAnimation({
        name: "layout",
        motionValue: node.projectionProgress,
        keyframes: 1,
        transition,
      }) ?? null;

    node.projectionAnimation?.finished.then(() => {
      node.delta = null;
      node.apply({ transform: null }, false);
      node.options.onLayoutAnimationComplete?.();
    });
  }

  private getStack(id: string): LayoutIdStack {
    const existing = this.stacks.get(id);
    if (existing) return existing;

    const stack = new LayoutIdStack();
    this.stacks.set(id, stack);
    return stack;
  }

  private ensureObservers(): void {
    if (typeof window === "undefined") return;

    if (!this.removeWindowListeners) {
      const onResize = () => this.scheduleUpdate();
      window.addEventListener("resize", onResize);

      this.removeWindowListeners = () => {
        window.removeEventListener("resize", onResize);
      };
    }

    if (this.mutationObserver) return;
    if (typeof MutationObserver === "undefined") return;
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    if (!root) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" || mutation.type === "attributes") {
          this.scheduleUpdate();
          break;
        }
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    this.mutationObserver = observer;
  }

  private cleanupObservers(): void {
    this.removeWindowListeners?.();
    this.removeWindowListeners = null;

    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
  }
}

export const layoutManager = new LayoutManager();

export const createLayoutNode = (args: {
  element: HTMLElement | SVGElement;
  options: LayoutNodeOptions;
  apply: ProjectionUpdateHandler;
  render: () => void;
  scheduleRender: () => void;
}): LayoutNode => {
  const projectionProgress = motionValue(1);
  const opacity = motionValue(1);

  const node: LayoutNode = {
    element: args.element,
    options: args.options,
    prevBox: null,
    latestBox: null,
    delta: null,
    projectionProgress,
    projectionAnimation: null,
    opacity,
    opacityAnimation: null,
    opacityActive: false,
    apply: args.apply,
    render: args.render,
    scheduleRender: args.scheduleRender,
    stop: () => {
      node.projectionAnimation?.stop();
      node.opacityAnimation?.stop();
      node.projectionProgress.stop();
      node.opacity.stop();
    },
    destroy: () => {
      node.stop();
      node.delta = null;
      node.apply({ transform: null, opacity: null }, false);
    },
  };

  const unsubscribeProjection = projectionProgress.on("change", (latest) => {
    if (!node.delta) return;
    const transform = buildProjectionTransform(node.delta, latest);
    node.apply({ transform }, false);
  });

  const unsubscribeOpacity = opacity.on("change", (latest) => {
    if (!node.opacityActive) return;
    node.apply({ opacity: latest }, false);
  });

  const prevDestroy = node.destroy;
  node.destroy = () => {
    unsubscribeProjection();
    unsubscribeOpacity();
    prevDestroy();
  };

  return node;
};
