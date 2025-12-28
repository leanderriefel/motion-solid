import type {
  AnimationPlaybackControlsWithThen,
  MotionValue,
  ValueTransition,
} from "motion-dom";
import type { Transition } from "../../types";
import type { Box, Delta, Point } from "motion-utils";
import type { ResolvedValues } from "../types";

export type LayoutAnimationType =
  | boolean
  | "position"
  | "size"
  | "preserve-aspect";

export type LayoutCallbacks = {
  onBeforeLayoutMeasure?: (box: Box) => void;
  onLayoutMeasure?: (box: Box, prevBox: Box) => void;
  onLayoutAnimationStart?: () => void;
  onLayoutAnimationComplete?: () => void;
  onExitComplete?: () => void;
};

export type ProjectionNodeOptions = LayoutCallbacks & {
  layout?: LayoutAnimationType;
  layoutId?: string;
  layoutScroll?: boolean;
  layoutRoot?: boolean;
  crossfade?: boolean;
  transition?: Transition;
  transformTemplate?: (
    transform: Record<string, string | number>,
    generatedTransform: string,
  ) => string;
};

export interface Measurements {
  animationId: number;
  measuredBox: Box;
  layoutBox: Box;
  latestValues: ResolvedValues;
  source: number;
}

export type Phase = "snapshot" | "measure";

export interface ScrollMeasurements {
  animationId: number;
  phase: Phase;
  offset: Point;
  isRoot: boolean;
  wasRoot: boolean;
}

export type ProjectionUpdate = {
  transform?: string | null;
  transformOrigin?: string | null;
  opacity?: number | null;
  styles?: Record<string, string | number> | null;
};

export interface ProjectionNode {
  id: number;
  parent?: ProjectionNode;
  root: ProjectionNode;
  children: Set<ProjectionNode>;
  path: ProjectionNode[];
  depth: number;
  instance: HTMLElement | SVGElement | undefined;
  options: ProjectionNodeOptions;
  isUpdating: boolean;
  updateBlockedByResize: boolean;
  updateManuallyBlocked: boolean;
  animationId: number;
  animationCommitId: number;
  sharedNodes?: Map<string, unknown>;
  nodes?: unknown;

  latestValues: ResolvedValues;
  animationValues?: ResolvedValues;

  layout?: Measurements;
  snapshot?: Measurements;
  target?: Box;
  relativeTarget?: Box;
  relativeTargetOrigin?: Box;
  targetDelta?: Delta;
  targetWithTransforms?: Box;
  scroll?: ScrollMeasurements;
  treeScale?: Point;
  projectionDelta?: Delta;
  projectionDeltaWithTransform?: Delta;
  prevProjectionDelta?: Delta;

  isLayoutDirty: boolean;
  isProjectionDirty: boolean;
  isSharedProjectionDirty: boolean;
  isTransformDirty: boolean;
  isTreeAnimating?: boolean;
  isAnimationBlocked?: boolean;
  shouldResetTransform: boolean;
  prevTransformTemplateValue: string | undefined;
  layoutVersion: number;
  resolvedRelativeTargetAt?: number;
  hasProjected?: boolean;
  isVisible?: boolean;

  motionValue?: MotionValue<number>;
  currentAnimation?: AnimationPlaybackControlsWithThen;
  pendingAnimation?: number | null;
  mixTargetDelta?: (progress: number) => void;
  animationProgress?: number;
  resumeFrom?: ProjectionNode;
  resumingFrom?: ProjectionNode;
  preserveOpacity?: boolean;
  isPresent?: boolean;

  mount: (instance: HTMLElement | SVGElement) => void;
  unmount: () => void;
  setOptions: (options: ProjectionNodeOptions) => void;
  willUpdate: (notifyListeners?: boolean) => void;
  updateLayout: () => void;
  updateSnapshot: () => void;
  clearSnapshot: () => void;
  updateScroll: (phase?: Phase) => void;
  resetTransform: () => void;
  scheduleRender: (notifyAll?: boolean) => void;
  scheduleUpdateProjection: () => void;
  scheduleCheckAfterUnmount: () => void;
  checkUpdateFailed: () => void;

  isUpdateBlocked: () => boolean;
  isTreeAnimationBlocked: () => boolean;

  setTargetDelta: (delta: Delta) => void;
  setAnimationOrigin: (
    delta: Delta,
    hasOnlyRelativeTargetChanged?: boolean,
  ) => void;
  startAnimation: (transition: ValueTransition) => void;
  finishAnimation: () => void;
  completeAnimation: () => void;

  resolveTargetDelta: (force?: boolean) => void;
  calcProjection: () => void;
  applyTransformsToTarget: () => void;
  applyProjectionStyles: (styleValues?: ResolvedValues) => ProjectionUpdate;

  getClosestProjectingParent: () => ProjectionNode | undefined;
  createRelativeTarget: (
    relativeParent: ProjectionNode,
    layout: Box,
    parentLayout: Box,
  ) => void;
  removeRelativeTarget: () => void;

  promote: (options?: {
    needsReset?: boolean;
    transition?: Transition;
    preserveFollowOpacity?: boolean;
  }) => void;
  relegate: () => boolean;
  isLead: () => boolean;
  getLead: () => ProjectionNode;
  getPrevLead: () => ProjectionNode | undefined;
  getStack: () => any;
  show: () => void;
  hide: () => void;

  hasTreeAnimated: boolean;
}
