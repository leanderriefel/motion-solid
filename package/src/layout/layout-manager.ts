import { mixNumber, motionValue } from "motion-dom";
import type {
  AnimationPlaybackControlsWithThen,
  MotionValue,
  Transition,
  ValueTransition,
} from "motion-dom";
import type { Axis, AxisDelta, Box, Delta } from "motion-utils";
import { startMotionValueAnimation } from "../animation/motion-value";
import { isTransitionDefined } from "../animation/transition-utils";

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
  layoutScroll?: boolean;
  layoutRoot?: boolean;
  transition?: Transition;
};

type LayoutNode = {
  element: HTMLElement | SVGElement;
  options: LayoutNodeOptions;

  parent: LayoutNode | null;
  children: Set<LayoutNode>;

  prevBox: Box | null;
  latestBox: Box | null;

  delta: Delta | null;
  projectionProgress: MotionValue<number>;
  projectionAnimation: AnimationPlaybackControlsWithThen | null;
  projectionCycleId: number;

  opacity: MotionValue<number>;
  opacityAnimation: AnimationPlaybackControlsWithThen | null;
  opacityActive: boolean;
  opacityCycleId: number;

  apply: ProjectionUpdateHandler;
  render: () => void;
  scheduleRender: () => void;

  updateProjection: (immediate?: boolean) => void;
  syncScaleCorrectionSubscriptions: () => void;

  stop: () => void;
  destroy: () => void;
};

const DEFAULT_LAYOUT_TRANSITION: ValueTransition = {
  type: "tween",
  duration: 0.1,
};

const resolveLayoutTransition = (transition?: Transition): ValueTransition => {
  if (!transition) return DEFAULT_LAYOUT_TRANSITION;

  // Framer Motion semantics (approx):
  // - If `transition.layout` is provided, use it for layout animations.
  // - Otherwise, use the root transition.
  // - If neither defines an animation (e.g. only `delay` is provided), fall back to
  //   our default layout spring, while still inheriting root `delay`.
  //
  // Note: We return a ValueTransition (not the full Transition) to avoid passing
  // nested per-value keys through to motion-dom animation options.

  if (typeof transition !== "object" || transition === null) {
    return DEFAULT_LAYOUT_TRANSITION;
  }

  const root = transition as unknown as ValueTransition;
  const rootDelay = root.delay;

  const layoutOverride = (transition as { layout?: unknown }).layout;

  let resolved: ValueTransition;

  if (layoutOverride !== undefined) {
    if (layoutOverride && typeof layoutOverride === "object") {
      const layoutTransition = layoutOverride as ValueTransition;
      resolved = isTransitionDefined(layoutTransition)
        ? layoutTransition
        : DEFAULT_LAYOUT_TRANSITION;
    } else {
      resolved = DEFAULT_LAYOUT_TRANSITION;
    }
  } else {
    resolved = isTransitionDefined(root) ? root : DEFAULT_LAYOUT_TRANSITION;
  }

  if (rootDelay !== undefined && resolved.delay === undefined) {
    return { ...resolved, delay: rootDelay };
  }

  return resolved;
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

const hasValidSize = (box: Box): boolean => {
  const width = box.x.max - box.x.min;
  const height = box.y.max - box.y.min;
  return width > 0.5 && height > 0.5;
};

const isUsableBox = (box: Box): boolean => {
  return isValidBox(box) && hasValidSize(box);
};

const boxEquals = (a: Box, b: Box, threshold = 0.5): boolean => {
  return (
    Math.abs(a.x.min - b.x.min) <= threshold &&
    Math.abs(a.x.max - b.x.max) <= threshold &&
    Math.abs(a.y.min - b.y.min) <= threshold &&
    Math.abs(a.y.max - b.y.max) <= threshold
  );
};

/**
 * Get the current visual box of a node, taking animation progress into account.
 * This interpolates between prevBox and latestBox based on projectionProgress.
 */
const getVisualBox = (node: LayoutNode): Box | null => {
  const latestBox = node.latestBox;
  const prevBox = node.prevBox;

  // If no animation is running or we don't have both boxes, return latestBox
  if (!node.delta || !prevBox || !latestBox) {
    return latestBox ?? prevBox;
  }

  const progress = node.projectionProgress.get();

  // If animation is complete, return the final box
  if (progress >= 1) {
    return latestBox;
  }

  // If animation hasn't started, return the starting box
  if (progress <= 0) {
    return prevBox;
  }

  // Interpolate between prevBox and latestBox based on progress
  return {
    x: {
      min: mixNumber(prevBox.x.min, latestBox.x.min, progress),
      max: mixNumber(prevBox.x.max, latestBox.x.max, progress),
    },
    y: {
      min: mixNumber(prevBox.y.min, latestBox.y.min, progress),
      max: mixNumber(prevBox.y.max, latestBox.y.max, progress),
    },
  };
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

const clampProgress = (progress: number): number =>
  Math.min(1, Math.max(0, progress));

const safeInvert = (value: number): number => {
  if (!Number.isFinite(value) || value === 0) return 1;
  return 1 / value;
};

type AccumulatedTransform = {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  originX: number;
  originY: number;
};

const getNodeCenter = (node: LayoutNode): { x: number; y: number } => {
  const box = node.latestBox ?? node.prevBox;
  if (!box) return { x: 0, y: 0 };

  return {
    x: mixNumber(box.x.min, box.x.max, 0.5),
    y: mixNumber(box.y.min, box.y.max, 0.5),
  };
};

const getNodeCurrentTransform = (
  node: LayoutNode,
): {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
} => {
  if (!node.delta) {
    return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 };
  }

  const p = clampProgress(node.projectionProgress.get());

  return {
    translateX: mixNumber(node.delta.x.translate, 0, p),
    translateY: mixNumber(node.delta.y.translate, 0, p),
    scaleX: mixNumber(node.delta.x.scale, 1, p),
    scaleY: mixNumber(node.delta.y.scale, 1, p),
  };
};

const getAccumulatedParentTransform = (
  node: LayoutNode,
): AccumulatedTransform => {
  const result: AccumulatedTransform = {
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    originX: 0,
    originY: 0,
  };

  const ancestors: LayoutNode[] = [];
  let current = node.parent;
  while (current) {
    ancestors.push(current);
    current = current.parent;
  }

  // Process from root to immediate parent
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i]!;
    const transform = getNodeCurrentTransform(ancestor);
    const origin = getNodeCenter(ancestor);

    // CSS transform: translate(T) scale(S) around origin O
    // transforms point P to: O + S * (P - O) + T = S*P + (1-S)*O + T
    //
    // For accumulated transform A followed by new transform B:
    // B(A(P)) = B(A.scale * P + A.offset)
    //         = B.scale * (A.scale * P + A.offset) + B.offset
    //         = (B.scale * A.scale) * P + (B.scale * A.offset + B.offset)
    //
    // where offset = (1-scale)*origin + translate

    const ancestorOffsetX =
      (1 - transform.scaleX) * origin.x + transform.translateX;
    const ancestorOffsetY =
      (1 - transform.scaleY) * origin.y + transform.translateY;

    // New accumulated offset = newScale * oldOffset + newOffset
    const newOffsetX =
      transform.scaleX *
        (result.scaleX * 0 +
          (result.scaleX - 1) * result.originX +
          result.translateX) +
      ancestorOffsetX;
    const newOffsetY =
      transform.scaleY *
        (result.scaleY * 0 +
          (result.scaleY - 1) * result.originY +
          result.translateY) +
      ancestorOffsetY;

    result.scaleX *= transform.scaleX;
    result.scaleY *= transform.scaleY;
    result.translateX = newOffsetX - (result.scaleX - 1) * origin.x;
    result.translateY = newOffsetY - (result.scaleY - 1) * origin.y;
    result.originX = origin.x;
    result.originY = origin.y;
  }

  return result;
};

const applyTransformToPoint = (
  transform: AccumulatedTransform,
  pointX: number,
  pointY: number,
): { x: number; y: number } => {
  // CSS transform: translate(T) scale(S) around origin O
  // P' = O + S * (P - O) + T = S*P + (1-S)*O + T
  const x =
    transform.scaleX * pointX +
    (1 - transform.scaleX) * transform.originX +
    transform.translateX;
  const y =
    transform.scaleY * pointY +
    (1 - transform.scaleY) * transform.originY +
    transform.translateY;

  return { x, y };
};

const buildNodeProjectionTransform = (
  node: LayoutNode,
  progress: number,
): string | null => {
  const p = clampProgress(progress);
  const parentTransform = getAccumulatedParentTransform(node);
  const nodeCenter = getNodeCenter(node);

  if (!node.delta) {
    // No animation, just counteract parent scale
    const scaleX = safeInvert(parentTransform.scaleX);
    const scaleY = safeInvert(parentTransform.scaleY);

    const isIdentity =
      Math.abs(scaleX - 1) <= 0.0001 && Math.abs(scaleY - 1) <= 0.0001;

    if (isIdentity) return null;

    return `translate3d(0px, 0px, 0) scale(${scaleX}, ${scaleY})`;
  }

  // What the node wants in absolute page coordinates
  const desiredTranslateX = mixNumber(node.delta.x.translate, 0, p);
  const desiredTranslateY = mixNumber(node.delta.y.translate, 0, p);
  const desiredScaleX = mixNumber(node.delta.x.scale, 1, p);
  const desiredScaleY = mixNumber(node.delta.y.scale, 1, p);

  // Where the node's center should be in page coords
  const desiredCenterX = nodeCenter.x + desiredTranslateX;
  const desiredCenterY = nodeCenter.y + desiredTranslateY;

  // Where the node's center ends up after parent transform (before node's own transform)
  const afterParent = applyTransformToPoint(
    parentTransform,
    nodeCenter.x,
    nodeCenter.y,
  );

  // Local translation needed to reach desired position
  // Note: parent scale affects our translation, so we need to account for it
  const localTranslateX =
    (desiredCenterX - afterParent.x) / parentTransform.scaleX;
  const localTranslateY =
    (desiredCenterY - afterParent.y) / parentTransform.scaleY;

  // Local scale to counteract parent scale and achieve desired scale
  const localScaleX = desiredScaleX / parentTransform.scaleX;
  const localScaleY = desiredScaleY / parentTransform.scaleY;

  // Sanitize values
  let tx = localTranslateX;
  let ty = localTranslateY;
  let sx = localScaleX;
  let sy = localScaleY;

  if (!Number.isFinite(tx)) tx = 0;
  if (!Number.isFinite(ty)) ty = 0;
  if (!Number.isFinite(sx) || sx === 0) sx = 1;
  if (!Number.isFinite(sy) || sy === 0) sy = 1;

  const isIdentity =
    Math.abs(tx) <= 0.5 &&
    Math.abs(ty) <= 0.5 &&
    Math.abs(sx - 1) <= 0.0001 &&
    Math.abs(sy - 1) <= 0.0001;

  if (isIdentity) return null;

  return `translate3d(${tx}px, ${ty}px, 0) scale(${sx}, ${sy})`;
};

/**
 * Measure the page box of an element, accounting for scroll offsets.
 * If scrollContainers is provided, their scroll positions are factored in.
 */
const measurePageBox = (
  element: Element,
  scrollContainers?: Set<Element>,
): Box => {
  const rect = element.getBoundingClientRect();
  const scrollX = typeof window === "undefined" ? 0 : window.scrollX;
  const scrollY = typeof window === "undefined" ? 0 : window.scrollY;

  let extraScrollX = 0;
  let extraScrollY = 0;

  // Account for scroll offsets in ancestor scroll containers marked with layoutScroll
  if (scrollContainers) {
    for (const container of scrollContainers) {
      // Check if the element is a descendant of this container
      if (container.contains(element)) {
        extraScrollX += container.scrollLeft;
        extraScrollY += container.scrollTop;
      }
    }
  }

  return {
    x: {
      min: rect.left + scrollX + extraScrollX,
      max: rect.right + scrollX + extraScrollX,
    },
    y: {
      min: rect.top + scrollY + extraScrollY,
      max: rect.bottom + scrollY + extraScrollY,
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
      // Use the current visual box (accounting for animation progress) for smooth interrupts
      this.snapshot = getVisualBox(prevLead) ?? this.snapshot;

      // Only use snapshot if it's valid (has non-zero size)
      const hasValidSnapshot = this.snapshot && isUsableBox(this.snapshot);

      if (hasValidSnapshot) {
        node.prevBox = this.snapshot;
      }

      // Only crossfade if we have a valid snapshot to animate from
      const shouldCrossfadeNew =
        hasValidSnapshot && node.options.layoutCrossfade !== false;
      const shouldCrossfadePrev =
        hasValidSnapshot && prevLead.options.layoutCrossfade !== false;

      if (shouldCrossfadeNew) {
        node.opacityActive = true;
        node.opacity.set(0);
        // Apply immediately to prevent flash of full opacity
        node.apply({ opacity: 0 }, true);
      }

      if (shouldCrossfadePrev) {
        prevLead.opacityActive = true;
        prevLead.opacity.set(1);
        // Apply immediately to maintain current opacity
        prevLead.apply({ opacity: 1 }, true);
      }

      if (shouldCrossfadeNew || shouldCrossfadePrev) {
        const transition = resolveLayoutTransition(node.options.transition);

        if (shouldCrossfadeNew) {
          node.opacityAnimation?.stop();
          const cycleId = ++node.opacityCycleId;
          node.opacityAnimation =
            startMotionValueAnimation({
              name: "opacity",
              motionValue: node.opacity,
              keyframes: 1,
              transition,
            }) ?? null;

          node.opacityAnimation?.finished.then(() => {
            if (node.opacityCycleId !== cycleId) return;
            node.opacityActive = false;
            node.apply({ opacity: null }, false);
          });
        }

        if (shouldCrossfadePrev) {
          prevLead.opacityAnimation?.stop();
          const cycleId = ++prevLead.opacityCycleId;
          prevLead.opacityAnimation =
            startMotionValueAnimation({
              name: "opacity",
              motionValue: prevLead.opacity,
              keyframes: 0,
              transition,
            }) ?? null;

          prevLead.opacityAnimation?.finished.then(() => {
            if (prevLead.opacityCycleId !== cycleId) return;
            prevLead.opacityActive = false;
            prevLead.apply({ opacity: null }, false);
          });
        }
      }

      return;
    }

    this.lead = node;

    if (this.snapshot && isUsableBox(this.snapshot)) {
      node.prevBox = this.snapshot;
    }
  }

  remove(node: LayoutNode): void {
    this.members.delete(node);

    if (this.lead === node) {
      // Use the current visual box for smooth interrupts
      this.snapshot = getVisualBox(node) ?? this.snapshot;

      const nextLead: LayoutNode | null =
        (this.prevLead && this.members.has(this.prevLead)
          ? this.prevLead
          : null) ??
        this.members.values().next().value ??
        null;

      this.lead = nextLead;
      this.prevLead = null;

      if (nextLead && this.snapshot && isUsableBox(this.snapshot)) {
        nextLead.prevBox = this.snapshot;
      }

      return;
    }

    if (this.prevLead === node) {
      this.prevLead = null;
    }
  }

  relegate(node: LayoutNode): void {
    if (this.lead !== node) return;

    // Use the current visual box for smooth interrupts
    this.snapshot = getVisualBox(node) ?? this.snapshot;

    let nextLead: LayoutNode | null = null;

    if (
      this.prevLead &&
      this.prevLead !== node &&
      this.members.has(this.prevLead)
    ) {
      nextLead = this.prevLead;
    } else {
      for (const member of this.members) {
        if (member === node) continue;
        nextLead = member;
        break;
      }
    }

    if (!nextLead) return;

    this.lead = nextLead;
    this.prevLead = null;

    if (this.snapshot && isUsableBox(this.snapshot)) {
      nextLead.prevBox = this.snapshot;
    }
  }

  isEmpty(): boolean {
    return this.members.size === 0;
  }

  hasSnapshot(): boolean {
    return this.snapshot !== null && isUsableBox(this.snapshot);
  }
}

class LayoutManager {
  private nodes = new Set<LayoutNode>();
  private nodeByElement = new WeakMap<Element, LayoutNode>();
  private stacks = new Map<string, LayoutIdStack>();

  private scheduled = false;
  private isFlushing = false;
  private flushCooldown = false; // Prevent ResizeObserver from triggering immediate re-flush

  private removeWindowListeners: VoidFunction | null = null;
  private mutationObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;

  register(node: LayoutNode): void {
    this.nodes.add(node);
    this.nodeByElement.set(node.element, node);

    if (node.options.layoutId) {
      this.getStack(node.options.layoutId).add(node);
    }

    this.ensureObservers();

    // Observe this element for size changes
    this.resizeObserver?.observe(node.element);

    this.scheduleUpdate();
  }

  unregister(node: LayoutNode): void {
    this.nodes.delete(node);
    this.nodeByElement.delete(node.element);

    if (node.parent) node.parent.children.delete(node);
    node.parent = null;

    for (const child of node.children) {
      child.parent = null;
    }
    node.children.clear();

    // Stop observing this element
    this.resizeObserver?.unobserve(node.element);

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

  relegate(node: LayoutNode): void {
    const layoutId = node.options.layoutId;
    if (!layoutId) return;

    const stack = this.stacks.get(layoutId);
    stack?.relegate(node);
    this.scheduleUpdate();
  }

  scheduleUpdate(): void {
    if (typeof window === "undefined") return;
    if (this.scheduled) return;

    this.scheduled = true;

    const run = () => {
      this.scheduled = false;
      this.flush();
    };

    // Coalesce multiple layout invalidations into a single frame.
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(run);
    } else {
      queueMicrotask(run);
    }
  }

  private rebuildTree(nodes: LayoutNode[]): void {
    for (const node of nodes) {
      node.parent = null;
      node.children.clear();
    }

    for (const node of nodes) {
      // If this node is marked as layoutRoot, don't connect it to any parent
      // This makes it a root of its own layout tree (for sticky positioning etc.)
      if (node.options.layoutRoot) {
        continue;
      }

      let parentEl = node.element.parentElement;

      while (parentEl) {
        const parentNode = this.nodeByElement.get(parentEl);
        if (parentNode) {
          node.parent = parentNode;
          parentNode.children.add(node);
          break;
        }
        parentEl = parentEl.parentElement;
      }
    }
  }

  flush(): void {
    if (typeof window === "undefined") return;
    if (this.isFlushing) return;

    this.isFlushing = true;

    const nodes = Array.from(this.nodes);

    // Early exit if no nodes
    if (nodes.length === 0) {
      this.isFlushing = false;
      return;
    }

    // Only measure nodes that have layout enabled
    const layoutNodes = nodes.filter(
      (n) => n.options.layout || n.options.layoutId,
    );

    // Early exit if no nodes need measuring
    if (layoutNodes.length === 0) {
      this.isFlushing = false;
      return;
    }

    // Only rebuild tree if we have work to do
    this.rebuildTree(nodes);

    const depthCache = new Map<LayoutNode, number>();
    const getDepth = (node: LayoutNode): number => {
      const cached = depthCache.get(node);
      if (cached !== undefined) return cached;

      const depth = node.parent ? getDepth(node.parent) + 1 : 0;
      depthCache.set(node, depth);
      return depth;
    };

    // Sort layout nodes by depth
    layoutNodes.sort((a, b) => getDepth(a) - getDepth(b));

    // Collect scroll containers (nodes marked with layoutScroll)
    const scrollContainers = new Set<Element>();
    for (const node of layoutNodes) {
      if (node.options.layoutScroll) {
        scrollContainers.add(node.element);
      }
    }

    // Notify before measure using last snapshot.
    for (const node of layoutNodes) {
      const prevBox = node.prevBox;
      if (prevBox) node.options.onBeforeLayoutMeasure?.(prevBox);
    }

    // Only remove/restore transforms for nodes we're measuring
    const previousTransforms: Array<[HTMLElement | SVGElement, string]> = [];
    for (const node of layoutNodes) {
      const el = node.element;
      previousTransforms.push([el, el.style.transform]);
      el.style.transform = "none";
    }

    // Force a single synchronous layout
    const measurements = new Map<LayoutNode, Box>();
    for (const node of layoutNodes) {
      measurements.set(
        node,
        measurePageBox(
          node.element,
          scrollContainers.size > 0 ? scrollContainers : undefined,
        ),
      );
    }

    // Restore transforms in a single batch
    for (const [el, transform] of previousTransforms) {
      el.style.transform = transform;
    }

    for (const node of layoutNodes) {
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

      // Skip animation if prevBox is invalid (zero-sized, etc.)
      if (!isUsableBox(prevBox)) {
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

    // Sync subscriptions and apply scale-correction transforms only for layout nodes
    for (const node of layoutNodes) {
      node.syncScaleCorrectionSubscriptions();
      node.updateProjection(false);
    }

    this.isFlushing = false;

    // Set a cooldown to prevent ResizeObserver from immediately re-triggering
    // flush after our transform changes cause browser layout
    this.flushCooldown = true;
    requestAnimationFrame(() => {
      this.flushCooldown = false;
    });
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

    node.syncScaleCorrectionSubscriptions();
    node.updateProjection(true);

    node.options.onLayoutAnimationStart?.();

    const cycleId = ++node.projectionCycleId;

    node.projectionAnimation =
      startMotionValueAnimation({
        name: "layout",
        motionValue: node.projectionProgress,
        keyframes: 1,
        transition,
      }) ?? null;

    node.projectionAnimation?.finished.then(() => {
      if (node.projectionCycleId !== cycleId) return;
      node.delta = null;
      node.updateProjection(false);
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

    // Create ResizeObserver for layout elements
    if (!this.resizeObserver && typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        // Skip if we're in the middle of flushing or in post-flush cooldown
        // The cooldown prevents the ResizeObserver from re-triggering flush
        // immediately after our transform changes cause a layout
        if (this.isFlushing || this.flushCooldown) return;

        this.scheduleUpdate();
      });

      // Observe all currently registered nodes
      for (const node of this.nodes) {
        this.resizeObserver.observe(node.element);
      }
    }

    // Note: We intentionally don't use a global MutationObserver as it's too aggressive
    // and can cause performance issues. Layout changes should be detected via:
    // 1. ResizeObserver for size changes on layout elements
    // 2. Explicit layoutDependency tracking for app state changes
    // 3. register/unregister calls for element mount/unmount

    if (this.mutationObserver) return;
    if (typeof MutationObserver === "undefined") return;
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    if (!root) return;

    const observer = new MutationObserver((mutations) => {
      // Ignore mutations triggered by our own flush operations
      if (this.isFlushing || this.flushCooldown) return;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          this.scheduleUpdate();
          break;
        }
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    this.mutationObserver = observer;
  }

  private cleanupObservers(): void {
    this.removeWindowListeners?.();
    this.removeWindowListeners = null;

    this.mutationObserver?.disconnect();
    this.mutationObserver = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
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

  let latestProjectionTransform: string | null = null;

  const scaleCorrectionSubscriptions = new Map<LayoutNode, VoidFunction>();

  const node: LayoutNode = {
    element: args.element,
    options: args.options,

    parent: null,
    children: new Set(),

    prevBox: null,
    latestBox: null,

    delta: null,
    projectionProgress,
    projectionAnimation: null,
    projectionCycleId: 0,

    opacity,
    opacityAnimation: null,
    opacityActive: false,
    opacityCycleId: 0,

    apply: args.apply,
    render: args.render,
    scheduleRender: args.scheduleRender,

    updateProjection: (immediate = false) => {
      const progress = node.delta ? node.projectionProgress.get() : 1;
      const transform = buildNodeProjectionTransform(node, progress);

      if (transform === latestProjectionTransform) return;
      latestProjectionTransform = transform;

      node.apply({ transform }, immediate);
    },

    syncScaleCorrectionSubscriptions: () => {
      const nextAncestors = new Set<LayoutNode>();
      let current = node.parent;

      while (current) {
        nextAncestors.add(current);
        current = current.parent;
      }

      for (const [ancestor, unsubscribe] of scaleCorrectionSubscriptions) {
        if (nextAncestors.has(ancestor)) continue;
        unsubscribe();
        scaleCorrectionSubscriptions.delete(ancestor);
      }

      for (const ancestor of nextAncestors) {
        if (scaleCorrectionSubscriptions.has(ancestor)) continue;

        const unsubscribe = ancestor.projectionProgress.on("change", () => {
          node.updateProjection(false);
        });

        scaleCorrectionSubscriptions.set(ancestor, unsubscribe);
      }
    },

    stop: () => {
      node.projectionCycleId++;
      node.opacityCycleId++;
      node.projectionAnimation?.stop();
      node.opacityAnimation?.stop();
      node.projectionProgress.stop();
      node.opacity.stop();
    },

    destroy: () => {
      node.stop();
      node.delta = null;
      latestProjectionTransform = null;

      for (const unsub of scaleCorrectionSubscriptions.values()) {
        unsub();
      }
      scaleCorrectionSubscriptions.clear();

      node.apply({ transform: null, opacity: null }, false);
    },
  };

  const unsubscribeProjection = projectionProgress.on("change", () => {
    if (!node.delta) return;
    node.updateProjection(false);
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
