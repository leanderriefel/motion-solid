import { mixNumber, motionValue } from "motion-dom";
import type {
  AnimationPlaybackControlsWithThen,
  MotionValue,
  Transition,
  ValueTransition,
} from "motion-dom";
import type { Axis, AxisDelta, Box, Delta } from "motion-utils";
import type { MotionElement } from "../types";
import { startMotionValueAnimation } from "../animation/motion-value";
import { getTransitionForKey } from "../animation/transition-utils";

export type LayoutAnimationType =
  | boolean
  | "position"
  | "size"
  | "preserve-aspect";

type LayoutTransitionScope = "descendants";

type LayoutTransitionTarget = MotionElement | string;

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

  // The initial delta calculated when layout changes
  delta: Delta | null;

  // Separate motion values for each transform property - animated directly
  // This fixes spring animations which need to overshoot in the correct direction
  translateX: MotionValue<number>;
  translateY: MotionValue<number>;
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;

  projectionAnimations: AnimationPlaybackControlsWithThen[];
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

type LayoutTransitionTargetDescriptor =
  | { type: "element"; element: MotionElement }
  | { type: "layoutId"; layoutId: string };

type LayoutTransitionSnapshot = {
  targets: LayoutTransitionTargetDescriptor[];
  scope: LayoutTransitionScope;
  includeAll: boolean;
  nodes: LayoutNode[];
  beforeBoxes: Map<LayoutNode, Box>;
  visualSnapshots: Map<LayoutNode, Box | null>;
};

const DEFAULT_LAYOUT_TRANSITION: ValueTransition = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10,
};

const resolveLayoutTransition = (transition?: Transition): ValueTransition => {
  return (
    getTransitionForKey(transition, "layout", DEFAULT_LAYOUT_TRANSITION) ??
    DEFAULT_LAYOUT_TRANSITION
  );
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

const formatLayoutTarget = (
  target: LayoutTransitionTargetDescriptor,
): string => {
  if (target.type === "layoutId") {
    return `layoutId "${target.layoutId}"`;
  }

  return "element ref";
};

const assertLayoutTarget = (
  target: LayoutTransitionTargetDescriptor,
  node: LayoutNode | null,
): LayoutNode => {
  if (node) return node;

  throw new Error(
    `[motion-solid] layout target must reference an element with layout or layoutId property set. Could not resolve ${formatLayoutTarget(
      target,
    )}.`,
  );
};

/**
 * Get the current visual box of a node, taking animation into account.
 * Computes the visual box from the current transform motion values.
 */
const getVisualBox = (node: LayoutNode): Box | null => {
  const latestBox = node.latestBox;

  if (!latestBox) {
    return node.prevBox;
  }

  // If no animation is active, return the latest measured box
  if (!node.delta) {
    return latestBox;
  }

  // Get current transform values
  const translateX = node.translateX.get();
  const translateY = node.translateY.get();
  const scaleX = node.scaleX.get();
  const scaleY = node.scaleY.get();

  // If transform is at identity, return latestBox
  if (
    Math.abs(translateX) <= 0.5 &&
    Math.abs(translateY) <= 0.5 &&
    Math.abs(scaleX - 1) <= 0.0001 &&
    Math.abs(scaleY - 1) <= 0.0001
  ) {
    return latestBox;
  }

  // Calculate the current visual box by applying the inverse transform
  // The transform is applied around the center, so we need to account for that
  const latestWidth = latestBox.x.max - latestBox.x.min;
  const latestHeight = latestBox.y.max - latestBox.y.min;
  const latestCenterX = (latestBox.x.min + latestBox.x.max) / 2;
  const latestCenterY = (latestBox.y.min + latestBox.y.max) / 2;

  // Visual center = latestCenter + translate
  const visualCenterX = latestCenterX + translateX;
  const visualCenterY = latestCenterY + translateY;

  // Visual size = latestSize * scale
  const visualWidth = latestWidth * scaleX;
  const visualHeight = latestHeight * scaleY;

  return {
    x: {
      min: visualCenterX - visualWidth / 2,
      max: visualCenterX + visualWidth / 2,
    },
    y: {
      min: visualCenterY - visualHeight / 2,
      max: visualCenterY + visualHeight / 2,
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
  // Read directly from motion values - these are animated with actual values
  // so spring overshoot works correctly
  return {
    translateX: node.translateX.get(),
    translateY: node.translateY.get(),
    scaleX: node.scaleX.get(),
    scaleY: node.scaleY.get(),
  };
};

const getAccumulatedParentTransform = (
  node: LayoutNode,
): AccumulatedTransform => {
  const ancestors: LayoutNode[] = [];
  let current = node.parent;
  while (current) {
    ancestors.push(current);
    current = current.parent;
  }

  let offsetX = 0;
  let offsetY = 0;
  let scaleX = 1;
  let scaleY = 1;
  let originX = 0;
  let originY = 0;

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

    offsetX = transform.scaleX * offsetX + ancestorOffsetX;
    offsetY = transform.scaleY * offsetY + ancestorOffsetY;

    scaleX *= transform.scaleX;
    scaleY *= transform.scaleY;
    originX = origin.x;
    originY = origin.y;
  }

  return {
    translateX: offsetX - (1 - scaleX) * originX,
    translateY: offsetY - (1 - scaleY) * originY,
    scaleX,
    scaleY,
    originX,
    originY,
  };
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

const buildNodeProjectionTransform = (node: LayoutNode): string | null => {
  const parentTransform = getAccumulatedParentTransform(node);
  const nodeCenter = getNodeCenter(node);

  // Read current transform values directly from motion values
  const desiredTranslateX = node.translateX.get();
  const desiredTranslateY = node.translateY.get();
  const desiredScaleX = node.scaleX.get();
  const desiredScaleY = node.scaleY.get();

  // Check if this is effectively identity (no animation or animation complete)
  const isEffectivelyIdentity =
    Math.abs(desiredTranslateX) <= 0.5 &&
    Math.abs(desiredTranslateY) <= 0.5 &&
    Math.abs(desiredScaleX - 1) <= 0.0001 &&
    Math.abs(desiredScaleY - 1) <= 0.0001;

  if (isEffectivelyIdentity && !node.delta) {
    // No animation, just counteract parent scale
    const scaleX = safeInvert(parentTransform.scaleX);
    const scaleY = safeInvert(parentTransform.scaleY);

    const isIdentity =
      Math.abs(scaleX - 1) <= 0.0001 && Math.abs(scaleY - 1) <= 0.0001;

    if (isIdentity) return null;

    return `translate3d(0px, 0px, 0) scale(${scaleX}, ${scaleY})`;
  }

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
const isFixedPosition = (element: Element): boolean => {
  if (typeof window === "undefined") return false;

  let current: Element | null = element;
  while (current) {
    if (window.getComputedStyle(current).position === "fixed") {
      return true;
    }
    current = current.parentElement;
  }

  return false;
};

const measurePageBox = (
  element: Element,
  scrollContainers?: Set<Element>,
): Box => {
  const rect = element.getBoundingClientRect();
  const isFixed = isFixedPosition(element);
  const scrollX = typeof window === "undefined" || isFixed ? 0 : window.scrollX;
  const scrollY = typeof window === "undefined" || isFixed ? 0 : window.scrollY;

  let extraScrollX = 0;
  let extraScrollY = 0;

  // Account for scroll offsets in ancestor scroll containers marked with layoutScroll
  if (!isFixed && scrollContainers) {
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

  getLead(): LayoutNode | null {
    return this.lead;
  }

  isEmpty(): boolean {
    return this.members.size === 0;
  }

  recordSnapshot(node: LayoutNode): void {
    const snapshot = getVisualBox(node);
    if (snapshot && isUsableBox(snapshot)) {
      this.snapshot = snapshot;
    }
  }

  hasSnapshot(): boolean {
    return this.snapshot !== null && isUsableBox(this.snapshot);
  }
}

class LayoutManager {
  private nodes = new Set<LayoutNode>();
  private nodeByElement = new WeakMap<Element, LayoutNode>();
  private stacks = new Map<string, LayoutIdStack>();
  private autoMeasureScheduled = false;

  register(node: LayoutNode): void {
    this.nodes.add(node);
    this.nodeByElement.set(node.element, node);

    if (node.options.layoutId) {
      this.getStack(node.options.layoutId).add(node);
      this.scheduleLayoutIdRemeasure(node.options.layoutId);
    }
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

    if (node.options.layoutId) {
      const stack = this.stacks.get(node.options.layoutId);
      stack?.remove(node);
      if (stack?.isEmpty() && !stack.hasSnapshot()) {
        this.stacks.delete(node.options.layoutId);
      }
    }

    node.destroy();
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
    }
  }

  relegate(node: LayoutNode): void {
    const layoutId = node.options.layoutId;
    if (!layoutId) return;

    const stack = this.stacks.get(layoutId);
    stack?.relegate(node);
  }

  captureLayoutIdSnapshot(node: LayoutNode): void {
    const layoutId = node.options.layoutId;
    if (!layoutId) return;

    this.stacks.get(layoutId)?.recordSnapshot(node);
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

  snapshotBefore(
    targets: LayoutTransitionTarget[] | null,
    scope: LayoutTransitionScope,
    includeAll = false,
  ): LayoutTransitionSnapshot | null {
    if (typeof window === "undefined") return null;

    const allNodes = Array.from(this.nodes);
    const descriptors = includeAll
      ? []
      : this.normalizeTargetDescriptors(targets ?? []);

    if (!includeAll && descriptors.length === 0) return null;

    if (allNodes.length > 0) {
      this.rebuildTree(allNodes);
    } else if (includeAll) {
      return null;
    }

    let nodes: LayoutNode[] = [];

    if (includeAll) {
      nodes = allNodes;
    } else {
      const nodesSet = new Set<LayoutNode>();
      for (const descriptor of descriptors) {
        const targetNode = assertLayoutTarget(
          descriptor,
          this.resolveTargetNode(descriptor),
        );

        const scoped = this.collectScopeNodes(targetNode, scope);
        for (const node of scoped) {
          nodesSet.add(node);
        }
      }

      nodes = Array.from(nodesSet);
    }

    if (nodes.length === 0) return null;

    this.sortByDepth(nodes);

    const scrollContainers = this.collectScrollContainers();
    const beforeBoxes = this.measureNodes(
      nodes,
      scrollContainers.size > 0 ? scrollContainers : undefined,
    );

    for (const node of nodes) {
      const box = beforeBoxes.get(node);
      if (!box || !isValidBox(box)) continue;
      node.latestBox = box;
    }

    const visualSnapshots = new Map<LayoutNode, Box | null>();
    for (const node of nodes) {
      if (node.delta) {
        visualSnapshots.set(node, getVisualBox(node));
      }
    }

    return {
      targets: descriptors,
      scope,
      includeAll,
      nodes,
      beforeBoxes,
      visualSnapshots,
    };
  }

  snapshotSubtree(element: MotionElement): LayoutTransitionSnapshot | null {
    if (typeof window === "undefined") return null;

    const node = this.nodeByElement.get(element);
    if (!node) return null;

    const allNodes = Array.from(this.nodes);
    if (allNodes.length === 0) return null;

    this.rebuildTree(allNodes);

    const nodes = this.collectScopeNodes(node, "descendants");
    if (nodes.length === 0) return null;

    this.sortByDepth(nodes);

    const scrollContainers = this.collectScrollContainers();
    const beforeBoxes = this.measureNodes(
      nodes,
      scrollContainers.size > 0 ? scrollContainers : undefined,
    );

    for (const subtreeNode of nodes) {
      const box = beforeBoxes.get(subtreeNode);
      if (!box || !isValidBox(box)) continue;
      subtreeNode.latestBox = box;
    }

    const visualSnapshots = new Map<LayoutNode, Box | null>();
    for (const subtreeNode of nodes) {
      if (subtreeNode.delta) {
        visualSnapshots.set(subtreeNode, getVisualBox(subtreeNode));
      }
    }

    return {
      targets: [{ type: "element", element }],
      scope: "descendants",
      includeAll: false,
      nodes,
      beforeBoxes,
      visualSnapshots,
    };
  }

  scheduleAutoMeasure(): void {
    if (this.autoMeasureScheduled) return;

    const snapshot = this.snapshotBefore(null, "descendants", true);
    if (!snapshot) return;

    this.autoMeasureScheduled = true;

    schedulePostLayoutMeasure(() => {
      this.autoMeasureScheduled = false;
      this.measureAfter(snapshot);
    });
  }

  scheduleSubtreeMeasure(element: MotionElement): void {
    const snapshot = this.snapshotSubtree(element);
    if (!snapshot) return;
    schedulePostLayoutMeasure(() => this.measureAfter(snapshot));
  }

  snapshotLayoutId(layoutId: string): LayoutTransitionSnapshot | null {
    if (typeof window === "undefined") return null;

    const targetNode = this.stacks.get(layoutId)?.getLead() ?? null;
    if (!targetNode) return null;

    const allNodes = Array.from(this.nodes);
    if (allNodes.length === 0) return null;

    this.rebuildTree(allNodes);

    const nodes = this.collectScopeNodes(targetNode, "descendants");
    if (nodes.length === 0) return null;

    this.sortByDepth(nodes);

    const scrollContainers = this.collectScrollContainers();
    const beforeBoxes = this.measureNodes(
      nodes,
      scrollContainers.size > 0 ? scrollContainers : undefined,
    );

    for (const subtreeNode of nodes) {
      const box = beforeBoxes.get(subtreeNode);
      if (!box || !isValidBox(box)) continue;
      subtreeNode.latestBox = box;
    }

    const visualSnapshots = new Map<LayoutNode, Box | null>();
    for (const subtreeNode of nodes) {
      if (subtreeNode.delta) {
        visualSnapshots.set(subtreeNode, getVisualBox(subtreeNode));
      }
    }

    return {
      targets: [{ type: "layoutId", layoutId }],
      scope: "descendants",
      includeAll: false,
      nodes,
      beforeBoxes,
      visualSnapshots,
    };
  }

  scheduleLayoutIdMeasure(layoutId: string): void {
    const snapshot = this.snapshotLayoutId(layoutId);
    if (!snapshot) return;
    schedulePostLayoutMeasure(() => this.measureAfter(snapshot));
  }

  scheduleLayoutIdRemeasure(layoutId: string): void {
    if (this.autoMeasureScheduled) return;

    const stack = this.stacks.get(layoutId);
    if (!stack) return;

    if (!stack.hasSnapshot()) {
      this.scheduleLayoutIdMeasure(layoutId);
      return;
    }

    const snapshot: LayoutTransitionSnapshot = {
      targets: [{ type: "layoutId", layoutId }],
      scope: "descendants",
      includeAll: false,
      nodes: [],
      beforeBoxes: new Map(),
      visualSnapshots: new Map(),
    };

    schedulePostLayoutMeasure(() => this.measureAfter(snapshot));
  }

  measureAfter(snapshot: LayoutTransitionSnapshot): void {
    if (typeof window === "undefined") return;

    const allNodes = Array.from(this.nodes);
    if (allNodes.length === 0) return;

    this.rebuildTree(allNodes);

    let nodes: LayoutNode[] = [];

    if (snapshot.includeAll) {
      nodes = allNodes;
    } else {
      const merged = new Set<LayoutNode>();

      for (const node of snapshot.nodes) {
        if (this.nodes.has(node)) {
          merged.add(node);
        }
      }

      for (const target of snapshot.targets) {
        const targetNode = this.resolveTargetNode(target);
        if (!targetNode) continue;

        const scoped = this.collectScopeNodes(targetNode, snapshot.scope);
        for (const node of scoped) {
          if (this.nodes.has(node)) {
            merged.add(node);
          }
        }
      }

      nodes = Array.from(merged);
    }

    if (nodes.length === 0) return;

    this.sortByDepth(nodes);

    const scrollContainers = this.collectScrollContainers();

    for (const node of nodes) {
      const beforeBox = snapshot.beforeBoxes.get(node) ?? node.prevBox;
      if (beforeBox) node.options.onBeforeLayoutMeasure?.(beforeBox);
    }

    const measurements = this.measureNodes(
      nodes,
      scrollContainers.size > 0 ? scrollContainers : undefined,
    );

    for (const node of nodes) {
      const box = measurements.get(node);
      if (!box) continue;
      if (!isValidBox(box)) continue;

      const visualSnapshot = snapshot.visualSnapshots.get(node);
      const beforeBox = snapshot.beforeBoxes.get(node);
      const animationStartBox =
        visualSnapshot ?? beforeBox ?? node.prevBox ?? null;

      node.latestBox = box;

      node.options.onLayoutMeasure?.(box, animationStartBox ?? box);

      const layoutType = resolveLayoutType(
        node.options.layout,
        node.options.layoutId,
      );
      if (!layoutType) {
        node.prevBox = box;
        continue;
      }

      if (!animationStartBox) {
        node.prevBox = box;
        continue;
      }

      // Skip animation if animationStartBox is invalid (zero-sized, etc.)
      if (!isUsableBox(animationStartBox)) {
        node.prevBox = box;
        continue;
      }

      if (boxEquals(animationStartBox, box)) {
        node.prevBox = box;
        continue;
      }

      const delta = calcBoxDelta(box, animationStartBox);
      applyLayoutType(delta, layoutType, box, animationStartBox);

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

    for (const node of nodes) {
      node.syncScaleCorrectionSubscriptions();
      node.updateProjection(false);
    }
  }

  private normalizeTargetDescriptors(
    targets: LayoutTransitionTarget[],
  ): LayoutTransitionTargetDescriptor[] {
    const descriptors: LayoutTransitionTargetDescriptor[] = [];
    const seenLayoutIds = new Set<string>();
    const seenElements = new Set<MotionElement>();

    for (const target of targets) {
      if (typeof target === "string") {
        if (!target) continue;
        if (seenLayoutIds.has(target)) continue;
        seenLayoutIds.add(target);
        descriptors.push({ type: "layoutId", layoutId: target });
        continue;
      }

      if (!target) continue;
      if (seenElements.has(target)) continue;
      seenElements.add(target);
      descriptors.push({ type: "element", element: target });
    }

    return descriptors;
  }

  private resolveTargetNode(
    target: LayoutTransitionTargetDescriptor,
  ): LayoutNode | null {
    if (target.type === "layoutId") {
      return this.stacks.get(target.layoutId)?.getLead() ?? null;
    }

    return this.nodeByElement.get(target.element) ?? null;
  }

  private collectScopeNodes(
    target: LayoutNode,
    scope: LayoutTransitionScope,
  ): LayoutNode[] {
    const nodes: LayoutNode[] = [];
    const stack: LayoutNode[] = [target];

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) continue;
      nodes.push(node);

      if (scope === "descendants") {
        for (const child of node.children) {
          stack.push(child);
        }
      }
    }

    return nodes;
  }

  private sortByDepth(nodes: LayoutNode[]): void {
    const depthCache = new Map<LayoutNode, number>();
    const getDepth = (node: LayoutNode): number => {
      const cached = depthCache.get(node);
      if (cached !== undefined) return cached;

      const depth = node.parent ? getDepth(node.parent) + 1 : 0;
      depthCache.set(node, depth);
      return depth;
    };

    nodes.sort((a, b) => getDepth(a) - getDepth(b));
  }

  private collectScrollContainers(): Set<Element> {
    const scrollContainers = new Set<Element>();

    for (const node of this.nodes) {
      if (node.options.layoutScroll) {
        scrollContainers.add(node.element);
      }
    }

    return scrollContainers;
  }

  private measureNodes(
    nodes: LayoutNode[],
    scrollContainers?: Set<Element>,
  ): Map<LayoutNode, Box> {
    const previousTransforms: Array<[HTMLElement | SVGElement, string]> = [];

    for (const node of nodes) {
      const el = node.element;
      previousTransforms.push([el, el.style.transform]);
      el.style.transform = "none";
    }

    const measurements = new Map<LayoutNode, Box>();
    for (const node of nodes) {
      measurements.set(node, measurePageBox(node.element, scrollContainers));
    }

    for (const [el, transform] of previousTransforms) {
      el.style.transform = transform;
    }

    return measurements;
  }

  private startLayoutAnimation(
    node: LayoutNode,
    delta: Delta,
    transition: Transition,
  ): void {
    node.delta = delta;

    // Stop any existing animations
    for (const anim of node.projectionAnimations) {
      anim.stop();
    }
    node.projectionAnimations = [];

    /**
     * IMPORTANT: Use `jump` (not `set`) to apply the starting projection values.
     *
     * MotionValue tracks velocity based on the delta between updates. When we
     * "teleport" a value (0 -> delta) and then start a spring, the computed
     * velocity from that teleport gets fed into the spring, causing:
     * - a bounce in the wrong direction at the start
     * - energy gain when interrupting/toggling quickly
     *
     * `jump` resets velocity to 0 and stops any active animations.
     */
    node.translateX.jump(delta.x.translate);
    node.translateY.jump(delta.y.translate);
    node.scaleX.jump(delta.x.scale);
    node.scaleY.jump(delta.y.scale);

    node.syncScaleCorrectionSubscriptions();
    node.updateProjection(true);

    node.options.onLayoutAnimationStart?.();

    const cycleId = ++node.projectionCycleId;
    let completedCount = 0;

    const onComplete = () => {
      completedCount++;
      // Only fire completion when all 4 animations are done
      if (completedCount < 4) return;
      if (node.projectionCycleId !== cycleId) return;

      node.delta = null;
      node.updateProjection(false);
      node.options.onLayoutAnimationComplete?.();
    };

    // Animate translateX from delta.x.translate to 0
    const translateXAnim = startMotionValueAnimation({
      name: "translateX",
      motionValue: node.translateX,
      keyframes: 0,
      transition,
    });
    if (translateXAnim) {
      node.projectionAnimations.push(translateXAnim);
      translateXAnim.finished.then(onComplete);
    } else {
      completedCount++;
    }

    // Animate translateY from delta.y.translate to 0
    const translateYAnim = startMotionValueAnimation({
      name: "translateY",
      motionValue: node.translateY,
      keyframes: 0,
      transition,
    });
    if (translateYAnim) {
      node.projectionAnimations.push(translateYAnim);
      translateYAnim.finished.then(onComplete);
    } else {
      completedCount++;
    }

    // Animate scaleX from delta.x.scale to 1
    const scaleXAnim = startMotionValueAnimation({
      name: "scaleX",
      motionValue: node.scaleX,
      keyframes: 1,
      transition,
    });
    if (scaleXAnim) {
      node.projectionAnimations.push(scaleXAnim);
      scaleXAnim.finished.then(onComplete);
    } else {
      completedCount++;
    }

    // Animate scaleY from delta.y.scale to 1
    const scaleYAnim = startMotionValueAnimation({
      name: "scaleY",
      motionValue: node.scaleY,
      keyframes: 1,
      transition,
    });
    if (scaleYAnim) {
      node.projectionAnimations.push(scaleYAnim);
      scaleYAnim.finished.then(onComplete);
    } else {
      completedCount++;
    }

    // If all animations were skipped, complete immediately
    if (completedCount >= 4) {
      node.delta = null;
      node.updateProjection(false);
      node.options.onLayoutAnimationComplete?.();
    }
  }

  private getStack(id: string): LayoutIdStack {
    const existing = this.stacks.get(id);
    if (existing) return existing;

    const stack = new LayoutIdStack();
    this.stacks.set(id, stack);
    return stack;
  }
}

export const layoutManager = new LayoutManager();

const schedulePostLayoutMeasure = (work: () => void): void => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(work);
    return;
  }

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => work());
    return;
  }

  if (typeof Promise !== "undefined") {
    Promise.resolve().then(work);
    return;
  }

  setTimeout(work, 0);
};

export const createLayoutNode = (args: {
  element: HTMLElement | SVGElement;
  options: LayoutNodeOptions;
  apply: ProjectionUpdateHandler;
  render: () => void;
  scheduleRender: () => void;
}): LayoutNode => {
  // Create motion values for each transform property
  // Initialize to identity (no transform)
  const translateX = motionValue(0);
  const translateY = motionValue(0);
  const scaleX = motionValue(1);
  const scaleY = motionValue(1);
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
    translateX,
    translateY,
    scaleX,
    scaleY,
    projectionAnimations: [],
    projectionCycleId: 0,

    opacity,
    opacityAnimation: null,
    opacityActive: false,
    opacityCycleId: 0,

    apply: args.apply,
    render: args.render,
    scheduleRender: args.scheduleRender,

    updateProjection: (immediate = false) => {
      const transform = buildNodeProjectionTransform(node);

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

        // Subscribe to all transform values of ancestor
        const unsubs: VoidFunction[] = [];
        unsubs.push(
          ancestor.translateX.on("change", () => node.updateProjection(false)),
        );
        unsubs.push(
          ancestor.translateY.on("change", () => node.updateProjection(false)),
        );
        unsubs.push(
          ancestor.scaleX.on("change", () => node.updateProjection(false)),
        );
        unsubs.push(
          ancestor.scaleY.on("change", () => node.updateProjection(false)),
        );

        const unsubscribe = () => unsubs.forEach((u) => u());
        scaleCorrectionSubscriptions.set(ancestor, unsubscribe);
      }
    },

    stop: () => {
      node.projectionCycleId++;
      node.opacityCycleId++;
      for (const anim of node.projectionAnimations) {
        anim.stop();
      }
      node.projectionAnimations = [];
      node.opacityAnimation?.stop();
      node.translateX.stop();
      node.translateY.stop();
      node.scaleX.stop();
      node.scaleY.stop();
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

  // Subscribe to transform value changes to update projection
  const unsubTranslateX = translateX.on("change", () => {
    if (!node.delta) return;
    node.updateProjection(false);
  });
  const unsubTranslateY = translateY.on("change", () => {
    if (!node.delta) return;
    node.updateProjection(false);
  });
  const unsubScaleX = scaleX.on("change", () => {
    if (!node.delta) return;
    node.updateProjection(false);
  });
  const unsubScaleY = scaleY.on("change", () => {
    if (!node.delta) return;
    node.updateProjection(false);
  });

  const unsubscribeOpacity = opacity.on("change", (latest) => {
    if (!node.opacityActive) return;
    node.apply({ opacity: latest }, false);
  });

  const prevDestroy = node.destroy;
  node.destroy = () => {
    unsubTranslateX();
    unsubTranslateY();
    unsubScaleX();
    unsubScaleY();
    unsubscribeOpacity();
    prevDestroy();
  };

  return node;
};
