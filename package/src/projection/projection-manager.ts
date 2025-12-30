import { mixNumber, motionValue } from "motion-dom";
import type {
  AnimationPlaybackControlsWithThen,
  MotionValue,
  ValueTransition,
} from "motion-dom";
import { frame } from "motion-dom";
import type { Transition } from "../types";
import type { Axis, AxisDelta, Box, Delta, Point } from "motion-utils";
import { startMotionValueAnimation } from "../animation/motion-value";
import { getTransitionForKey } from "../animation/transition-utils";
import { buildTransform, createRenderState } from "../animation/render";
import { mixValues } from "./animation/mix-values";
import { copyAxisDeltaInto, copyBoxInto } from "./geometry/copy";
import {
  applyBoxDelta,
  applyTreeDeltas,
  transformBox,
  translateAxis,
} from "./geometry/delta-apply";
import {
  calcBoxDelta,
  calcLength,
  calcRelativeBox,
  calcRelativePosition,
  isNear,
} from "./geometry/delta-calc";
import { removeBoxTransforms } from "./geometry/delta-remove";
import { createBox, createDelta, createPoint } from "./geometry/models";
import {
  aspectRatio,
  axisDeltaEquals,
  boxEquals,
  boxEqualsRounded,
  isDeltaZero,
} from "./geometry/utils";
import { scaleCorrectors } from "./styles/scale-correction";
import { buildProjectionTransform } from "./styles/transform";
import { eachAxis } from "./utils/each-axis";
import { has2DTranslate, hasScale, hasTransform } from "./utils/has-transform";
import { NodeStack } from "./shared/stack";
import { globalProjectionState } from "./state";
import type { ResolvedValues } from "./types";
import type {
  LayoutAnimationType,
  Measurements,
  ProjectionNodeOptions,
  ProjectionUpdate,
  ScrollMeasurements,
} from "./node/types";

const animationTarget = 1000;

const DEFAULT_LAYOUT_TRANSITION: ValueTransition = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1],
};

const resolveLayoutTransition = (transition?: Transition): ValueTransition => {
  return (
    getTransitionForKey(transition, "layout", DEFAULT_LAYOUT_TRANSITION) ??
    DEFAULT_LAYOUT_TRANSITION
  );
};

const resolveAnimationType = (
  layout: LayoutAnimationType | undefined,
  layoutId?: string,
): "size" | "position" | "both" | "preserve-aspect" | undefined => {
  if (!layout && !layoutId) return undefined;

  if (layout === "position") return "position";
  if (layout === "size") return "size";
  if (layout === "preserve-aspect") return "preserve-aspect";

  return "both";
};

const shouldAnimatePositionOnly = (
  animationType: string | undefined,
  snapshot: Box,
  layout: Box,
): boolean => {
  return (
    animationType === "position" ||
    (animationType === "preserve-aspect" &&
      !isNear(aspectRatio(snapshot), aspectRatio(layout), 0.2))
  );
};

const roundAxis = (axis: Axis): void => {
  axis.min = Math.round(axis.min);
  axis.max = Math.round(axis.max);
};

const roundBox = (box: Box): void => {
  roundAxis(box.x);
  roundAxis(box.y);
};

const checkNodeWasScrollRoot = (node: ProjectionNodeImpl): boolean =>
  Boolean(node.scroll?.wasRoot);

const isFixedPosition = (element: Element): boolean => {
  if (typeof window === "undefined") return false;

  let current: Element | null = element;
  while (current) {
    if (window.getComputedStyle(current).position === "fixed") return true;
    current = current.parentElement;
  }

  return false;
};

const measureScroll = (element: Element): Point => {
  if (typeof window === "undefined") return { x: 0, y: 0 };

  if (
    element === document.documentElement ||
    element === document.body ||
    element === document.scrollingElement
  ) {
    return { x: window.scrollX, y: window.scrollY };
  }

  return {
    x: (element as HTMLElement).scrollLeft,
    y: (element as HTMLElement).scrollTop,
  };
};

const checkIsScrollRoot = (element: Element): boolean => {
  if (typeof window === "undefined") return false;

  if (
    element === document.documentElement ||
    element === document.body ||
    element === document.scrollingElement
  ) {
    return true;
  }

  return isFixedPosition(element);
};

let projectionNodeId = 0;

type ProjectionUpdateHandler = (
  update: ProjectionUpdate,
  immediate: boolean,
) => void;

type CreateProjectionNodeArgs = {
  element: HTMLElement | SVGElement;
  options: ProjectionNodeOptions;
  apply: ProjectionUpdateHandler;
  render: () => void;
  scheduleRender: () => void;
  latestValues: ResolvedValues;
  getStyleValues?: () => ResolvedValues | undefined;
};

class ProjectionNodeImpl {
  id = projectionNodeId++;
  parent?: ProjectionNodeImpl;
  root: ProjectionNodeImpl;
  children = new Set<ProjectionNodeImpl>();
  path: ProjectionNodeImpl[] = [];
  depth = 0;
  instance: HTMLElement | SVGElement | undefined;
  options: ProjectionNodeOptions;
  latestValues: ResolvedValues;
  animationValues?: ResolvedValues;

  layout?: Measurements;
  snapshot?: Measurements;
  targetLayout?: Box;
  layoutCorrected: Box = createBox();
  target?: Box;
  relativeTarget?: Box;
  relativeTargetOrigin?: Box;
  relativeParent?: ProjectionNodeImpl;
  targetDelta?: Delta;
  targetWithTransforms?: Box;
  scroll?: ScrollMeasurements;
  treeScale: Point = createPoint();
  projectionDelta?: Delta;
  projectionDeltaWithTransform?: Delta;
  prevProjectionDelta?: Delta;

  isLayoutDirty = false;
  isProjectionDirty = false;
  isSharedProjectionDirty = false;
  isTransformDirty = false;
  isTreeAnimating = false;
  isAnimationBlocked = false;
  shouldResetTransform = false;
  prevTransformTemplateValue: string | undefined;
  layoutVersion = 0;
  linkedParentVersion = 0;
  resolvedRelativeTargetAt = 0;
  attemptToResolveRelativeTarget = false;
  hasProjected = false;
  isVisible = true;

  motionValue?: MotionValue<number>;
  currentAnimation?: AnimationPlaybackControlsWithThen;
  pendingAnimation: number | null = null;
  mixTargetDelta?: (progress: number) => void;
  animationProgress = 0;
  resumeFrom?: ProjectionNodeImpl;
  resumingFrom?: ProjectionNodeImpl;
  preserveOpacity?: boolean;
  isPresent?: boolean;

  isUpdating = false;
  updateBlockedByResize = false;
  updateManuallyBlocked = false;
  animationId = 0;
  animationCommitId = 0;
  hasTreeAnimated = false;
  sharedNodes?: Map<string, NodeStack>;

  applyUpdate: ProjectionUpdateHandler;
  render: () => void;
  scheduleRenderImpl: () => void;
  getStyleValues?: () => ResolvedValues | undefined;
  manager: ProjectionManager;
  private isRoot = false;
  private isSVG = false;
  private isMounted = false;
  private motionValueSubscription?: VoidFunction;

  constructor(args: {
    manager: ProjectionManager;
    options: ProjectionNodeOptions;
    latestValues: ResolvedValues;
    apply?: ProjectionUpdateHandler;
    render?: () => void;
    scheduleRender?: () => void;
    getStyleValues?: () => ResolvedValues | undefined;
    element?: HTMLElement | SVGElement;
    isRoot?: boolean;
  }) {
    this.manager = args.manager;
    this.options = args.options;
    this.latestValues = args.latestValues;
    this.applyUpdate = args.apply ?? (() => undefined);
    this.render = args.render ?? (() => undefined);
    this.scheduleRenderImpl = args.scheduleRender ?? (() => undefined);
    this.getStyleValues = args.getStyleValues;
    this.instance = args.element;
    this.isRoot = Boolean(args.isRoot);
    this.root = this.isRoot ? this : this.manager.root;

    if (this.isRoot) {
      this.sharedNodes = this.manager.stacks;
      this.options.layoutScroll = true;
    }
  }

  mount(instance: HTMLElement | SVGElement): void {
    if (this.isMounted) return;
    this.isMounted = true;

    if (!this.instance) {
      this.instance = instance;
    }

    const element = this.instance;
    if (!element) return;

    this.isSVG =
      element instanceof SVGElement && !(element instanceof SVGSVGElement);

    if (
      this.root.hasTreeAnimated &&
      (this.options.layout || this.options.layoutId)
    ) {
      this.isLayoutDirty = true;
    }

    if (this.options.layoutId) {
      this.manager.registerSharedNode(this.options.layoutId, this);
      const stack = this.getStack();
      if (stack) {
        if (stack.snapshot && !this.snapshot) {
          this.snapshot = stack.snapshot;
        }
        if (!stack.snapshot) {
          stack.recordSnapshot(this);
        }
      }
    }
  }

  unmount(): void {
    const hasLayoutId = Boolean(this.options.layoutId);
    const hasLayout = Boolean(this.options.layout) || hasLayoutId;

    // Notify parent to take a snapshot BEFORE we unmount
    // This allows the parent to animate from old layout (with this child)
    // to new layout (without this child), including flex gap changes
    if (
      this.parent &&
      (this.parent.options.layout || this.parent.options.layoutId)
    ) {
      this.parent.willUpdate();
    }

    if (hasLayoutId) {
      this.willUpdate();
    }

    const stack = this.getStack();
    if (hasLayoutId && stack) {
      stack.recordSnapshot(this, true);
    }
    stack?.remove(this);

    this.parent?.children.delete(this);
    this.instance = undefined;
    this.isMounted = false;

    this.manager.scheduleUpdateProjection();

    // Schedule a check after unmount to trigger sibling/parent animations
    if (hasLayout) {
      this.scheduleCheckAfterUnmount();
    }
  }

  setOptions(options: ProjectionNodeOptions): void {
    this.options = {
      ...this.options,
      ...options,
      crossfade: options.crossfade !== undefined ? options.crossfade : true,
    };
  }

  isUpdateBlocked(): boolean {
    return (
      this.manager.updateManuallyBlocked || this.manager.updateBlockedByResize
    );
  }

  isTreeAnimationBlocked(): boolean {
    return (
      this.isAnimationBlocked ||
      (this.parent?.isTreeAnimationBlocked() ?? false)
    );
  }

  willUpdate(): void {
    this.root.hasTreeAnimated = true;

    if (this.isUpdateBlocked()) {
      this.options.onExitComplete?.();
      return;
    }

    if (!this.manager.isUpdating) {
      this.manager.startUpdate();
    }

    if (this.isLayoutDirty) return;

    this.isLayoutDirty = true;
    for (let i = 0; i < this.path.length; i++) {
      const node = this.path[i]!;
      node.shouldResetTransform = true;
      node.updateScroll("snapshot");
    }

    const { layoutId, layout } = this.options;
    if (layoutId === undefined && !layout) return;

    const transformTemplate = this.options.transformTemplate;
    this.prevTransformTemplateValue = transformTemplate
      ? transformTemplate(this.latestValues, "")
      : undefined;

    this.updateSnapshot();
  }

  updateSnapshot(): void {
    if (this.snapshot || !this.instance) return;

    this.snapshot = this.measure();

    if (
      this.snapshot &&
      !calcLength(this.snapshot.measuredBox.x) &&
      !calcLength(this.snapshot.measuredBox.y)
    ) {
      this.snapshot = undefined;
    }
  }

  updateLayout(): void {
    if (!this.instance) return;

    this.updateScroll();

    if (!this.isLayoutDirty) return;

    if (this.resumeFrom && !this.resumeFrom.instance) {
      for (let i = 0; i < this.path.length; i++) {
        const node = this.path[i]!;
        node.updateScroll();
      }
    }

    const prevLayout = this.layout;
    this.layout = this.measure(false);
    this.layoutVersion++;
    this.layoutCorrected = createBox();
    this.isLayoutDirty = false;
    this.projectionDelta = undefined;

    if (prevLayout) {
      this.options.onLayoutMeasure?.(
        this.layout.layoutBox,
        prevLayout.layoutBox,
      );
    }
  }

  updateScroll(phase: "snapshot" | "measure" = "measure"): void {
    if (!this.instance) return;

    const isRootNode = this.isRoot;
    const needsMeasurement = isRootNode || this.options.layoutScroll;

    if (needsMeasurement) {
      const isRoot = checkIsScrollRoot(this.instance);
      this.scroll = {
        animationId: this.manager.animationId,
        phase,
        isRoot,
        offset: measureScroll(this.instance),
        wasRoot: this.scroll ? this.scroll.isRoot : isRoot,
      };
    }
  }

  resetTransform(): void {
    if (!this.instance) return;

    const isResetRequested =
      this.isLayoutDirty ||
      this.shouldResetTransform ||
      this.options.layoutRoot;

    const hasProjection =
      this.projectionDelta && !isDeltaZero(this.projectionDelta);

    const transformTemplate = this.options.transformTemplate;
    const transformTemplateValue = transformTemplate
      ? transformTemplate(this.latestValues, "")
      : undefined;

    const transformTemplateHasChanged =
      transformTemplateValue !== this.prevTransformTemplateValue;

    if (
      isResetRequested &&
      (hasProjection ||
        hasTransform(this.latestValues) ||
        transformTemplateHasChanged)
    ) {
      const renderState = createRenderState();
      let transform = buildTransform(
        this.latestValues,
        renderState.transform,
        transformTemplate,
      );

      if (this.latestValues.transform !== undefined) {
        transform = String(this.latestValues.transform);
      }

      this.instance.style.transform = transform === "none" ? "" : transform;
      this.shouldResetTransform = false;
      this.scheduleRender();
    }
  }

  measure(removeTransform: boolean = true): Measurements {
    const pageBox = this.measurePageBox();
    let layoutBox = this.removeElementScroll(pageBox);

    if (removeTransform) {
      layoutBox = this.removeTransform(layoutBox);
    }

    roundBox(layoutBox);

    return {
      animationId: this.manager.animationId,
      measuredBox: pageBox,
      layoutBox,
      latestValues: { ...this.latestValues },
      source: this.id,
    };
  }

  measurePageBox(): Box {
    if (!this.instance) return createBox();

    const rect = this.instance.getBoundingClientRect();
    const isFixed = isFixedPosition(this.instance);
    const scrollX =
      typeof window === "undefined" || isFixed ? 0 : window.scrollX;
    const scrollY =
      typeof window === "undefined" || isFixed ? 0 : window.scrollY;

    const box: Box = {
      x: { min: rect.left + scrollX, max: rect.right + scrollX },
      y: { min: rect.top + scrollY, max: rect.bottom + scrollY },
    };

    const wasInScrollRoot =
      this.scroll?.wasRoot || this.path.some(checkNodeWasScrollRoot);

    if (!wasInScrollRoot) {
      const rootScroll = this.manager.root.scroll;
      if (rootScroll) {
        translateAxis(box.x, rootScroll.offset.x);
        translateAxis(box.y, rootScroll.offset.y);
      }
    }

    return box;
  }

  removeElementScroll(box: Box): Box {
    const boxWithoutScroll = createBox();
    copyBoxInto(boxWithoutScroll, box);

    if (this.scroll?.wasRoot) {
      return boxWithoutScroll;
    }

    for (let i = 0; i < this.path.length; i++) {
      const node = this.path[i]!;
      const { scroll, options } = node;

      if (node !== this && scroll && options.layoutScroll) {
        if (scroll.wasRoot) {
          copyBoxInto(boxWithoutScroll, box);
        }

        translateAxis(boxWithoutScroll.x, scroll.offset.x);
        translateAxis(boxWithoutScroll.y, scroll.offset.y);
      }
    }

    return boxWithoutScroll;
  }

  applyTransform(box: Box, transformOnly = false): Box {
    const withTransforms = createBox();
    copyBoxInto(withTransforms, box);

    for (let i = 0; i < this.path.length; i++) {
      const node = this.path[i]!;

      if (
        !transformOnly &&
        node.options.layoutScroll &&
        node.scroll &&
        node.parent
      ) {
        transformBox(withTransforms, {
          x: -node.scroll.offset.x,
          y: -node.scroll.offset.y,
        });
      }

      if (!hasTransform(node.latestValues)) continue;
      transformBox(withTransforms, node.latestValues);
    }

    if (hasTransform(this.latestValues)) {
      transformBox(withTransforms, this.latestValues);
    }

    return withTransforms;
  }

  removeTransform(box: Box): Box {
    const boxWithoutTransform = createBox();
    copyBoxInto(boxWithoutTransform, box);

    for (let i = 0; i < this.path.length; i++) {
      const node = this.path[i]!;
      if (!node.instance) continue;
      if (!hasTransform(node.latestValues)) continue;

      if (hasScale(node.latestValues)) {
        node.updateSnapshot();
      }

      const sourceBox = createBox();
      const nodeBox = node.measurePageBox();
      copyBoxInto(sourceBox, nodeBox);

      removeBoxTransforms(
        boxWithoutTransform,
        node.latestValues,
        node.snapshot ? node.snapshot.layoutBox : undefined,
        sourceBox,
      );
    }

    if (hasTransform(this.latestValues)) {
      removeBoxTransforms(boxWithoutTransform, this.latestValues);
    }

    return boxWithoutTransform;
  }

  setTargetDelta(delta: Delta): void {
    this.targetDelta = delta;
    this.manager.scheduleUpdateProjection();
    this.isProjectionDirty = true;
  }

  clearSnapshot(): void {
    this.resumeFrom = this.snapshot = undefined;
  }

  scheduleRender(notifyAll = true): void {
    this.scheduleRenderImpl();
    if (notifyAll && this.options.layoutId) {
      const stack = this.getStack();
      stack?.scheduleRender();
    }

    if (this.resumingFrom && !this.resumingFrom.instance) {
      this.resumingFrom = undefined;
    }
  }

  scheduleUpdateProjection(): void {
    this.manager.scheduleUpdateProjection();
  }

  scheduleCheckAfterUnmount(): void {
    queueMicrotask(() => {
      if (this.isLayoutDirty) {
        this.manager.flushUpdates();
      } else {
        this.manager.checkUpdateFailed();
      }
    });
  }

  checkUpdateFailed(): void {
    if (this.manager.isUpdating) {
      this.manager.isUpdating = false;
      this.manager.clearAllSnapshots();
    }
  }

  getClosestProjectingParent(): ProjectionNodeImpl | undefined {
    if (
      !this.parent ||
      hasScale(this.parent.latestValues) ||
      has2DTranslate(this.parent.latestValues)
    ) {
      return undefined;
    }

    if (this.parent.isProjecting()) {
      return this.parent;
    }

    return this.parent.getClosestProjectingParent();
  }

  isProjecting(): boolean {
    return Boolean(
      (this.relativeTarget || this.targetDelta || this.options.layoutRoot) &&
      this.layout,
    );
  }

  createRelativeTarget(
    relativeParent: ProjectionNodeImpl,
    layout: Box,
    parentLayout: Box,
  ): void {
    this.relativeParent = relativeParent;
    this.relativeTarget = createBox();
    this.relativeTargetOrigin = createBox();
    this.linkedParentVersion = relativeParent.layoutVersion;
    this.forceRelativeParentToResolveTarget();
    calcRelativePosition(this.relativeTargetOrigin, layout, parentLayout);
    copyBoxInto(this.relativeTarget, this.relativeTargetOrigin);
  }

  removeRelativeTarget(): void {
    this.relativeParent = this.relativeTarget = undefined;
  }

  forceRelativeParentToResolveTarget(): void {
    if (!this.relativeParent) return;

    if (
      this.relativeParent.resolvedRelativeTargetAt !==
      this.manager.frameTimestamp
    ) {
      this.relativeParent.resolveTargetDelta(true);
    }
  }

  resolveTargetDelta(forceRecalculation = false): void {
    const lead = this.getLead();
    this.isProjectionDirty ||= lead.isProjectionDirty;
    this.isTransformDirty ||= lead.isTransformDirty;
    this.isSharedProjectionDirty ||= lead.isSharedProjectionDirty;

    const isShared = Boolean(this.resumingFrom) || this !== lead;

    const canSkip = !(
      forceRecalculation ||
      (isShared && this.isSharedProjectionDirty) ||
      this.isProjectionDirty ||
      this.parent?.isProjectionDirty ||
      this.manager.updateBlockedByResize
    );

    if (canSkip) return;

    const { layout, layoutId } = this.options;
    if (!this.layout || !(layout || layoutId)) return;

    this.resolvedRelativeTargetAt = this.manager.frameTimestamp;

    const relativeParent = this.getClosestProjectingParent();

    if (
      relativeParent &&
      this.linkedParentVersion !== relativeParent.layoutVersion &&
      !relativeParent.options.layoutRoot
    ) {
      this.removeRelativeTarget();
    }

    if (!this.targetDelta && !this.relativeTarget) {
      if (relativeParent && relativeParent.layout) {
        this.createRelativeTarget(
          relativeParent,
          this.layout.layoutBox,
          relativeParent.layout.layoutBox,
        );
      } else {
        this.removeRelativeTarget();
      }
    }

    if (!this.relativeTarget && !this.targetDelta) return;

    if (!this.target) {
      this.target = createBox();
      this.targetWithTransforms = createBox();
    }

    if (
      this.relativeTarget &&
      this.relativeTargetOrigin &&
      this.relativeParent &&
      this.relativeParent.target
    ) {
      this.forceRelativeParentToResolveTarget();

      calcRelativeBox(
        this.target,
        this.relativeTarget,
        this.relativeParent.target,
      );
    } else if (this.targetDelta) {
      if (this.resumingFrom) {
        this.target = this.applyTransform(this.layout.layoutBox);
      } else {
        copyBoxInto(this.target, this.layout.layoutBox);
      }

      applyBoxDelta(this.target, this.targetDelta);
    } else {
      copyBoxInto(this.target, this.layout.layoutBox);
    }
  }

  calcProjection(): void {
    const lead = this.getLead();
    const isShared = Boolean(this.resumingFrom) || this !== lead;

    let canSkip = true;

    if (this.isProjectionDirty || this.parent?.isProjectionDirty) {
      canSkip = false;
    }

    if (isShared && (this.isSharedProjectionDirty || this.isTransformDirty)) {
      canSkip = false;
    }

    if (this.resolvedRelativeTargetAt === this.manager.frameTimestamp) {
      canSkip = false;
    }

    if (canSkip) return;

    this.isTreeAnimating = Boolean(
      (this.parent && this.parent.isTreeAnimating) ||
      this.currentAnimation ||
      this.pendingAnimation,
    );

    if (!this.isTreeAnimating) {
      this.targetDelta = this.relativeTarget = undefined;
    }

    const { layout, layoutId } = this.options;
    if (!this.layout || !(layout || layoutId)) return;

    copyBoxInto(this.layoutCorrected, this.layout.layoutBox);

    const prevTreeScaleX = this.treeScale.x;
    const prevTreeScaleY = this.treeScale.y;

    applyTreeDeltas(this.layoutCorrected, this.treeScale, this.path, isShared);

    if (
      lead.layout &&
      !lead.target &&
      (this.treeScale.x !== 1 || this.treeScale.y !== 1)
    ) {
      lead.target = lead.layout.layoutBox;
      lead.targetWithTransforms = createBox();
    }

    const { target } = lead;

    if (!target) {
      if (this.prevProjectionDelta) {
        this.createProjectionDeltas();
        this.scheduleRender();
      }

      return;
    }

    if (!this.projectionDelta || !this.prevProjectionDelta) {
      this.createProjectionDeltas();
    } else {
      copyAxisDeltaInto(this.prevProjectionDelta.x, this.projectionDelta.x);
      copyAxisDeltaInto(this.prevProjectionDelta.y, this.projectionDelta.y);
    }

    calcBoxDelta(
      this.projectionDelta!,
      this.layoutCorrected,
      target,
      this.latestValues,
    );

    if (this.options.layout === "position") {
      const invTreeScaleX =
        this.treeScale.x && Number.isFinite(this.treeScale.x)
          ? 1 / this.treeScale.x
          : 1;
      const invTreeScaleY =
        this.treeScale.y && Number.isFinite(this.treeScale.y)
          ? 1 / this.treeScale.y
          : 1;
      this.projectionDelta!.x.scale = invTreeScaleX;
      this.projectionDelta!.y.scale = invTreeScaleY;
    }

    if (
      this.treeScale.x !== prevTreeScaleX ||
      this.treeScale.y !== prevTreeScaleY ||
      !axisDeltaEquals(this.projectionDelta!.x, this.prevProjectionDelta!.x) ||
      !axisDeltaEquals(this.projectionDelta!.y, this.prevProjectionDelta!.y)
    ) {
      this.hasProjected = true;
      this.scheduleRender();
    }
  }

  applyTransformsToTarget(): void {
    const lead = this.getLead();
    let { targetWithTransforms, target, layout, latestValues } = lead;

    if (!targetWithTransforms || !target || !layout) return;

    const animationType = resolveAnimationType(
      this.options.layout,
      this.options.layoutId,
    );

    if (
      this !== lead &&
      this.layout &&
      layout &&
      shouldAnimatePositionOnly(
        animationType,
        this.layout.layoutBox,
        layout.layoutBox,
      )
    ) {
      target = this.target || createBox();

      const xLength = calcLength(this.layout.layoutBox.x);
      target.x.min = lead.target!.x.min;
      target.x.max = target.x.min + xLength;

      const yLength = calcLength(this.layout.layoutBox.y);
      target.y.min = lead.target!.y.min;
      target.y.max = target.y.min + yLength;
    }

    copyBoxInto(targetWithTransforms, target);

    transformBox(targetWithTransforms, latestValues);

    calcBoxDelta(
      this.projectionDeltaWithTransform!,
      this.layoutCorrected,
      targetWithTransforms,
      latestValues,
    );

    if (this.options.layout === "position") {
      const invTreeScaleX =
        this.treeScale.x && Number.isFinite(this.treeScale.x)
          ? 1 / this.treeScale.x
          : 1;
      const invTreeScaleY =
        this.treeScale.y && Number.isFinite(this.treeScale.y)
          ? 1 / this.treeScale.y
          : 1;
      this.projectionDeltaWithTransform!.x.scale = invTreeScaleX;
      this.projectionDeltaWithTransform!.y.scale = invTreeScaleY;
    }
  }

  applyProjectionStyles(styleValues?: ResolvedValues): ProjectionUpdate {
    const update: ProjectionUpdate = {};

    if (!this.instance || this.isSVG) return update;

    if (!this.isVisible) {
      update.styles = { visibility: "hidden" };
      return update;
    }

    const transformTemplate = this.options.transformTemplate;

    const lead = this.getLead();
    if (!this.projectionDelta || !this.layout || !lead.target) {
      if (this.options.layoutId) {
        const opacity =
          (this.latestValues.opacity as number) ??
          (this.latestValues["opacity"] as number) ??
          1;
        update.opacity = opacity;
        update.styles = {
          "pointer-events":
            lead === this
              ? String(styleValues?.["pointer-events"] ?? "")
              : "none",
        };
      }

      if (this.hasProjected && !hasTransform(this.latestValues)) {
        update.transform = "none";
        this.hasProjected = false;
      }

      return update;
    }

    const valuesToRender = lead.animationValues || lead.latestValues;
    this.applyTransformsToTarget();

    let transform = buildProjectionTransform(
      this.projectionDeltaWithTransform!,
      this.treeScale,
      valuesToRender,
    );

    if (transformTemplate) {
      transform = transformTemplate(valuesToRender, transform);
    }

    update.transform = transform;
    update.transformOrigin = `${this.projectionDelta!.x.origin * 100}% ${
      this.projectionDelta!.y.origin * 100
    }% 0`;

    if (lead.animationValues) {
      const leadOpacity =
        (valuesToRender.opacity as number) ??
        (this.latestValues.opacity as number) ??
        1;
      const exitOpacity = (
        valuesToRender as ResolvedValues & { opacityExit?: number }
      ).opacityExit;
      update.opacity =
        lead === this
          ? leadOpacity
          : this.preserveOpacity
            ? (this.latestValues.opacity as number)
            : (exitOpacity ?? 0);
    } else {
      const leadOpacity = valuesToRender.opacity as number | undefined;
      const exitOpacity = (
        valuesToRender as ResolvedValues & { opacityExit?: number }
      ).opacityExit;
      update.opacity =
        lead === this
          ? leadOpacity !== undefined
            ? leadOpacity
            : 1
          : (exitOpacity ?? 0);
    }

    const correctedStyles: Record<string, string | number> = {};

    for (const key in scaleCorrectors) {
      const value =
        valuesToRender[key] !== undefined
          ? valuesToRender[key]
          : styleValues?.[key];

      if (value === undefined) continue;

      const { correct, applyTo } = scaleCorrectors[key]!;
      const corrected = transform === "none" ? value : correct(value, lead);

      if (applyTo) {
        for (const targetKey of applyTo) {
          correctedStyles[targetKey] = corrected;
        }
      } else {
        correctedStyles[key] = corrected;
      }
    }

    if (this.options.layoutId) {
      correctedStyles["pointer-events"] =
        lead === this ? String(styleValues?.["pointer-events"] ?? "") : "none";
    }

    if (Object.keys(correctedStyles).length > 0) {
      update.styles = correctedStyles;
    }

    return update;
  }

  createProjectionDeltas(): void {
    this.prevProjectionDelta = createDelta();
    this.projectionDelta = createDelta();
    this.projectionDeltaWithTransform = createDelta();
  }

  setAnimationOrigin(delta: Delta, hasOnlyRelativeTargetChanged = false): void {
    const snapshot = this.snapshot;
    const snapshotLatestValues = snapshot ? snapshot.latestValues : {};
    const mixedValues = { ...this.latestValues };

    const targetDelta = createDelta();
    if (!this.relativeParent || !this.relativeParent.options.layoutRoot) {
      this.relativeTarget = this.relativeTargetOrigin = undefined;
    }
    this.attemptToResolveRelativeTarget = !hasOnlyRelativeTargetChanged;

    const relativeLayout = createBox();

    const snapshotSource = snapshot ? snapshot.source : undefined;
    const layoutSource = this.layout ? this.layout.source : undefined;
    const isSharedLayoutAnimation = snapshotSource !== layoutSource;
    const stack = this.getStack();
    const isOnlyMember = !stack || stack.members.length <= 1;
    const shouldCrossfadeOpacity = Boolean(
      isSharedLayoutAnimation &&
      !isOnlyMember &&
      this.options.crossfade === true &&
      !this.path.some(
        (node) => node.animationValues?.opacityExit !== undefined,
      ),
    );

    this.animationProgress = 0;

    let prevRelativeTarget: Box | undefined;

    this.mixTargetDelta = (latest: number) => {
      const progress = latest / animationTarget;

      mixAxisDelta(targetDelta.x, delta.x, progress);
      mixAxisDelta(targetDelta.y, delta.y, progress);
      this.setTargetDelta(targetDelta);

      if (
        this.relativeTarget &&
        this.relativeTargetOrigin &&
        this.layout &&
        this.relativeParent &&
        this.relativeParent.layout
      ) {
        calcRelativePosition(
          relativeLayout,
          this.layout.layoutBox,
          this.relativeParent.layout.layoutBox,
        );
        mixBox(
          this.relativeTarget,
          this.relativeTargetOrigin,
          relativeLayout,
          progress,
        );

        if (
          prevRelativeTarget &&
          boxEquals(this.relativeTarget, prevRelativeTarget)
        ) {
          this.isProjectionDirty = false;
        }

        if (!prevRelativeTarget) prevRelativeTarget = createBox();
        copyBoxInto(prevRelativeTarget, this.relativeTarget);
      }

      if (isSharedLayoutAnimation) {
        this.animationValues = mixedValues;

        mixValues(
          mixedValues,
          snapshotLatestValues,
          this.latestValues,
          progress,
          shouldCrossfadeOpacity,
          isOnlyMember,
        );
      }

      this.manager.scheduleUpdateProjection();
      this.scheduleRender();
      this.animationProgress = progress;
    };

    this.mixTargetDelta(this.options.layoutRoot ? animationTarget : 0);
  }

  startAnimation(transition: ValueTransition): void {
    this.options.onLayoutAnimationStart?.();

    this.currentAnimation?.stop();
    this.resumingFrom?.currentAnimation?.stop();

    if (this.pendingAnimation !== null) {
      cancelAnimationFrame(this.pendingAnimation);
    }

    this.pendingAnimation = requestAnimationFrame(() => {
      globalProjectionState.hasAnimatedSinceResize = true;
      this.motionValue ||= motionValue(0);

      if (!this.motionValueSubscription) {
        this.motionValueSubscription = this.motionValue.on(
          "change",
          (latest) => {
            this.mixTargetDelta?.(latest);
          },
        );
      }

      if (this.motionValue.jump) {
        this.motionValue.jump(0);
      } else {
        this.motionValue.set(0);
      }

      this.currentAnimation =
        startMotionValueAnimation({
          name: "layout",
          motionValue: this.motionValue,
          keyframes: animationTarget,
          transition,
        }) ?? undefined;

      if (this.currentAnimation) {
        this.currentAnimation.finished.then(() => this.completeAnimation());
      } else {
        this.completeAnimation();
      }

      if (this.resumingFrom) {
        this.resumingFrom.currentAnimation = this.currentAnimation;
      }

      this.pendingAnimation = null;
    });
  }

  completeAnimation(): void {
    if (this.resumingFrom) {
      this.resumingFrom.currentAnimation = undefined;
      this.resumingFrom.preserveOpacity = undefined;
    }

    const stack = this.getStack();
    stack?.exitAnimationComplete();

    this.resumingFrom =
      this.currentAnimation =
      this.animationValues =
        undefined;

    this.options.onLayoutAnimationComplete?.();
  }

  finishAnimation(): void {
    if (this.currentAnimation) {
      this.mixTargetDelta?.(animationTarget);
      this.currentAnimation.stop();
    }

    this.completeAnimation();
  }

  promote({
    needsReset,
    transition,
    preserveFollowOpacity,
  }: {
    needsReset?: boolean;
    transition?: Transition;
    preserveFollowOpacity?: boolean;
  } = {}): void {
    const stack = this.getStack();
    if (stack) stack.promote(this, preserveFollowOpacity);

    if (needsReset) {
      this.projectionDelta = undefined;
      this.needsReset = true;
    }
    if (transition) this.setOptions({ transition });
  }

  relegate(): boolean {
    const stack = this.getStack();
    if (stack) {
      return stack.relegate(this);
    }

    return false;
  }

  getStack(): NodeStack | undefined {
    const { layoutId } = this.options;
    if (layoutId) return this.manager.stacks.get(layoutId);
    return undefined;
  }

  isLead(): boolean {
    const stack = this.getStack();
    return stack ? stack.lead === this : true;
  }

  getLead(): ProjectionNodeImpl {
    const { layoutId } = this.options;
    return layoutId ? this.getStack()?.lead || this : this;
  }

  getPrevLead(): ProjectionNodeImpl | undefined {
    const { layoutId } = this.options;
    return layoutId ? this.getStack()?.prevLead : undefined;
  }

  show(): void {
    this.isVisible = true;
  }

  hide(): void {
    this.isVisible = false;
  }

  needsReset = false;
}

class ProjectionManager {
  nodes = new Set<ProjectionNodeImpl>();
  nodeByElement = new WeakMap<Element, ProjectionNodeImpl>();
  stacks = new Map<string, NodeStack>();
  root: ProjectionNodeImpl;

  isUpdating = false;
  updateBlockedByResize = false;
  updateManuallyBlocked = false;
  animationId = 0;
  projectionUpdateScheduled = false;
  frameTimestamp = 0;

  private updateScheduled = false;

  constructor() {
    this.root = new ProjectionNodeImpl({
      manager: this,
      options: { layoutScroll: true },
      latestValues: {},
      isRoot: true,
    });
  }

  createNode(args: CreateProjectionNodeArgs): ProjectionNodeImpl {
    return new ProjectionNodeImpl({
      manager: this,
      options: args.options,
      latestValues: args.latestValues,
      apply: args.apply,
      render: args.render,
      scheduleRender: args.scheduleRender,
      getStyleValues: args.getStyleValues,
      element: args.element,
    });
  }

  register(node: ProjectionNodeImpl): void {
    this.nodes.add(node);
    if (node.instance) this.nodeByElement.set(node.instance, node);

    if (node.instance) {
      node.mount(node.instance);
    }

    if (
      node.instance &&
      (node.options.layout ||
        node.options.layoutId ||
        globalProjectionState.hasEverUpdated)
    ) {
      this.scheduleUpdate(node.instance);
    }
  }

  unregister(node: ProjectionNodeImpl): void {
    node.unmount();
    this.nodes.delete(node);
    if (node.instance) this.nodeByElement.delete(node.instance);
  }

  updateNodeOptions(
    node: ProjectionNodeImpl,
    options: ProjectionNodeOptions,
  ): void {
    node.setOptions(options);
  }

  registerSharedNode(layoutId: string, node: ProjectionNodeImpl): void {
    if (!this.stacks.has(layoutId)) {
      this.stacks.set(layoutId, new NodeStack());
    }

    const stack = this.stacks.get(layoutId)!;
    const prevLead = stack.lead;

    // Capture snapshot from the previous lead before it loses lead status
    if (prevLead && prevLead !== node && prevLead.instance) {
      stack.recordSnapshot(prevLead);
    }

    stack.add(node);
    node.promote();

    // If there was a previous lead, the new node should animate from its position
    if (prevLead && prevLead !== node) {
      node.resumeFrom = prevLead;
      node.resumingFrom = prevLead;

      // Copy snapshot to new node
      if (stack.snapshot && !node.snapshot) {
        node.snapshot = stack.snapshot;
      }
    }
  }

  startUpdate(): void {
    if (this.updateManuallyBlocked || this.updateBlockedByResize) return;
    this.isUpdating = true;
    this.animationId++;
    this.root.updateScroll("snapshot");
  }

  scheduleUpdate(element: Element | null): void {
    if (element === null) {
      for (const node of this.nodes) {
        node.willUpdate();
      }
    } else {
      const node = this.nodeByElement.get(element);
      node?.willUpdate();
    }

    globalProjectionState.hasEverUpdated = true;

    if (this.updateScheduled) return;
    this.updateScheduled = true;
    queueMicrotask(() => this.flushUpdates());
  }

  flushUpdates(): void {
    this.updateScheduled = false;

    if (this.updateManuallyBlocked || this.updateBlockedByResize) return;

    this.frameTimestamp = performance.now();

    this.rebuildTree();

    const nodes = this.getSortedNodes();

    for (const node of nodes) {
      node.options.onBeforeLayoutMeasure?.(
        node.snapshot?.layoutBox ?? node.layout?.layoutBox ?? createBox(),
      );
    }

    for (const node of nodes) {
      node.resetTransform();
    }

    for (const node of nodes) {
      node.updateLayout();
    }

    for (const node of nodes) {
      notifyLayoutUpdate(node);
    }

    this.clearAllSnapshots();
    this.isUpdating = false;

    this.updateProjection(true);
  }

  scheduleUpdateProjection(): void {
    if (this.projectionUpdateScheduled) return;
    this.projectionUpdateScheduled = true;

    if (
      typeof requestAnimationFrame === "function" &&
      typeof frame.preRender === "function"
    ) {
      frame.preRender(() => {
        this.projectionUpdateScheduled = false;
        this.updateProjection(false);
      });
      return;
    }

    const schedule = (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16);

    schedule(() => {
      this.projectionUpdateScheduled = false;
      this.updateProjection(false);
    });
  }

  updateProjection(immediate: boolean): void {
    const nodes = this.getSortedNodes();

    nodes.forEach(propagateDirtyNodes);
    nodes.forEach((node) => node.resolveTargetDelta());
    nodes.forEach((node) => node.calcProjection());
    nodes.forEach(cleanDirtyNodes);

    for (const node of nodes) {
      const update = node.applyProjectionStyles(node.getStyleValues?.());
      node.applyUpdate(update, immediate);
    }
  }

  rebuildTree(): void {
    const nodes = Array.from(this.nodes);

    for (const node of nodes) {
      node.parent = undefined;
      node.children.clear();
    }

    for (const node of nodes) {
      if (!node.instance) continue;
      if (node.options.layoutRoot) continue;
      let parentEl = node.instance.parentElement;

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

    const depthCache = new Map<ProjectionNodeImpl, number>();
    const getDepth = (node: ProjectionNodeImpl): number => {
      const cached = depthCache.get(node);
      if (cached !== undefined) return cached;
      const depth = node.parent ? getDepth(node.parent) + 1 : 0;
      depthCache.set(node, depth);
      return depth;
    };

    for (const node of nodes) {
      node.depth = getDepth(node);
      const path: ProjectionNodeImpl[] = [];
      let current = node.parent;
      while (current) {
        path.unshift(current);
        current = current.parent;
      }
      node.path = path;
    }
  }

  getSortedNodes(): ProjectionNodeImpl[] {
    return Array.from(this.nodes).sort((a, b) => a.depth - b.depth);
  }

  clearAllSnapshots(): void {
    this.nodes.forEach((node) => {
      // Don't clear snapshots for nodes that are about to animate from a layoutId handoff
      if (!node.resumingFrom) {
        node.clearSnapshot();
      }
    });
  }

  checkUpdateFailed(): void {
    if (this.isUpdating) {
      this.isUpdating = false;
      this.clearAllSnapshots();
    }
  }
}

const notifyLayoutUpdate = (node: ProjectionNodeImpl): void => {
  const snapshot = node.resumingFrom?.snapshot || node.snapshot;

  if (node.isLead() && node.layout && snapshot) {
    const { layoutBox: layout, measuredBox: measuredLayout } = node.layout;
    const animationType = resolveAnimationType(
      node.options.layout,
      node.options.layoutId,
    );
    const isShared = snapshot.source !== node.layout.source;

    if (animationType === "size") {
      eachAxis((axis) => {
        const axisSnapshot = isShared
          ? snapshot.measuredBox[axis]
          : snapshot.layoutBox[axis];
        const length = calcLength(axisSnapshot);
        axisSnapshot.min = layout[axis].min;
        axisSnapshot.max = axisSnapshot.min + length;
      });
    } else if (
      shouldAnimatePositionOnly(animationType, snapshot.layoutBox, layout)
    ) {
      eachAxis((axis) => {
        const axisSnapshot = isShared
          ? snapshot.measuredBox[axis]
          : snapshot.layoutBox[axis];
        const length = calcLength(layout[axis]);
        axisSnapshot.max = axisSnapshot.min + length;

        if (node.relativeTarget && !node.currentAnimation) {
          node.isProjectionDirty = true;
          node.relativeTarget[axis].max =
            node.relativeTarget[axis].min + length;
        }
      });
    }

    const layoutDelta = createDelta();
    calcBoxDelta(layoutDelta, layout, snapshot.layoutBox);

    const visualDelta = createDelta();
    if (isShared) {
      calcBoxDelta(
        visualDelta,
        node.applyTransform(measuredLayout, true),
        snapshot.measuredBox,
      );
    } else {
      calcBoxDelta(visualDelta, layout, snapshot.layoutBox);
    }

    const hasLayoutChanged = !isDeltaZero(layoutDelta);
    let hasRelativeLayoutChanged = false;

    if (!node.resumeFrom) {
      const relativeParent = node.getClosestProjectingParent();
      if (relativeParent && !relativeParent.resumeFrom) {
        const { snapshot: parentSnapshot, layout: parentLayout } =
          relativeParent;

        if (parentSnapshot && parentLayout) {
          const relativeSnapshot = createBox();
          calcRelativePosition(
            relativeSnapshot,
            snapshot.layoutBox,
            parentSnapshot.layoutBox,
          );

          const relativeLayout = createBox();
          calcRelativePosition(relativeLayout, layout, parentLayout.layoutBox);

          if (!boxEqualsRounded(relativeSnapshot, relativeLayout)) {
            hasRelativeLayoutChanged = true;
          }

          if (relativeParent.options.layoutRoot) {
            node.relativeTarget = relativeLayout;
            node.relativeTargetOrigin = relativeSnapshot;
            node.relativeParent = relativeParent;
          }
        }
      }
    }

    node.options.onLayoutMeasure?.(layout, snapshot.layoutBox);

    if (node.isTreeAnimationBlocked()) {
      node.target = undefined;
      node.relativeTarget = undefined;
      return;
    }

    const layoutTransition = resolveLayoutTransition(node.options.transition);
    const hasTargetChanged =
      !node.targetLayout || !boxEqualsRounded(node.targetLayout, layout);
    const hasOnlyRelativeTargetChanged =
      !hasLayoutChanged && hasRelativeLayoutChanged;

    if (
      node.options.layoutRoot ||
      node.resumeFrom ||
      hasOnlyRelativeTargetChanged ||
      (hasLayoutChanged && (hasTargetChanged || !node.currentAnimation))
    ) {
      if (node.resumeFrom) {
        node.resumingFrom = node.resumeFrom;
        node.resumingFrom.resumingFrom = undefined;
      }

      const animationOptions = {
        ...layoutTransition,
      } as ValueTransition;

      if (node.options.layoutRoot) {
        animationOptions.delay = 0;
        animationOptions.type = false;
      }

      node.startAnimation(animationOptions);
      node.setAnimationOrigin(visualDelta, hasOnlyRelativeTargetChanged);
    } else {
      if (!hasLayoutChanged) {
        node.finishAnimation();
      }

      if (node.isLead() && node.options.onExitComplete) {
        node.options.onExitComplete();
      }
    }

    node.targetLayout = layout;
  } else if (node.isLead()) {
    node.options.onExitComplete?.();
  }
};

const propagateDirtyNodes = (node: ProjectionNodeImpl): void => {
  if (!node.parent) return;

  if (!node.isProjecting()) {
    node.isProjectionDirty = node.parent.isProjectionDirty;
  }

  node.isSharedProjectionDirty ||= Boolean(
    node.isProjectionDirty ||
    node.parent.isProjectionDirty ||
    node.parent.isSharedProjectionDirty,
  );

  node.isTransformDirty ||= node.parent.isTransformDirty;
};

const cleanDirtyNodes = (node: ProjectionNodeImpl): void => {
  node.isProjectionDirty = false;
  node.isSharedProjectionDirty = false;
  node.isTransformDirty = false;
};

const mixAxisDelta = (output: AxisDelta, delta: AxisDelta, p: number): void => {
  output.translate = mixNumber(delta.translate, 0, p);
  output.scale = mixNumber(delta.scale, 1, p);
  output.origin = delta.origin;
  output.originPoint = delta.originPoint;
};

const mixAxis = (output: Axis, from: Axis, to: Axis, p: number): void => {
  output.min = mixNumber(from.min, to.min, p);
  output.max = mixNumber(from.max, to.max, p);
};

const mixBox = (output: Box, from: Box, to: Box, p: number): void => {
  mixAxis(output.x, from.x, to.x, p);
  mixAxis(output.y, from.y, to.y, p);
};

export const projectionManager = new ProjectionManager();

export const createProjectionNode = (
  args: CreateProjectionNodeArgs,
): ProjectionNodeImpl => projectionManager.createNode(args);
