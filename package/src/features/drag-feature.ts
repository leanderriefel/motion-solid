import {
  Feature,
  addValueToWillChange,
  frame,
  isElementTextInput,
  isMotionValue,
  mixNumber,
  percent,
  setDragLock,
  type LayoutUpdateData,
  type MotionValue,
  type Transition,
  type VisualElement,
} from "motion-dom";
import { animateMotionValue } from "../animation/motion-value";
import type { MotionOptions } from "../types";
import type { DragControlOptions, DragControls } from "../gestures/use-drag";

type DragAxis = "x" | "y";

type Point = {
  x: number;
  y: number;
};

type DragInfo = {
  point: Point;
  delta: Point;
  offset: Point;
  velocity: Point;
};

type DragConstraints = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

type AxisBounds = {
  min?: number;
  max?: number;
};

type AxisElastic = {
  min: number;
  max: number;
};

type ResolvedConstraints = {
  x: AxisBounds;
  y: AxisBounds;
};

type ResolvedElastic = {
  x: AxisElastic;
  y: AxisElastic;
};

type InternalDragControls = DragControls & {
  subscribe?: (controls: VisualElementDragControls) => VoidFunction;
};

const noop = () => undefined;
const defaultElastic = 0.35;

const createPoint = (event: PointerEvent): Point => ({
  x: event.clientX,
  y: event.clientY,
});

const createDragInfo = (
  point: Point,
  startPoint: Point,
  lastPoint: Point,
  velocity: Point,
): DragInfo => ({
  point,
  delta: {
    x: point.x - lastPoint.x,
    y: point.y - lastPoint.y,
  },
  offset: {
    x: point.x - startPoint.x,
    y: point.y - startPoint.y,
  },
  velocity,
});

const shouldDrag = (
  axis: DragAxis,
  drag: MotionOptions["drag"],
  currentDirection: DragAxis | null,
) =>
  (drag === true || drag === axis) &&
  (currentDirection === null || currentDirection === axis);

const getCurrentDirection = (
  offset: Point,
  threshold = 10,
): DragAxis | null => {
  if (Math.abs(offset.y) > threshold) return "y";
  if (Math.abs(offset.x) > threshold) return "x";
  return null;
};

const resolvePointElastic = (
  dragElastic: MotionOptions["dragElastic"],
  label: "top" | "left" | "right" | "bottom",
): number => {
  if (typeof dragElastic === "number") return dragElastic;
  if (dragElastic === true || dragElastic === undefined) return defaultElastic;
  if (dragElastic === false) return 0;
  return dragElastic?.[label] ?? 0;
};

const resolveDragElastic = (
  dragElastic: MotionOptions["dragElastic"],
): ResolvedElastic => ({
  x: {
    min: resolvePointElastic(dragElastic, "left"),
    max: resolvePointElastic(dragElastic, "right"),
  },
  y: {
    min: resolvePointElastic(dragElastic, "top"),
    max: resolvePointElastic(dragElastic, "bottom"),
  },
});

const applyConstraints = (
  point: number,
  bounds: AxisBounds,
  elastic: AxisElastic,
): number => {
  if (bounds.min !== undefined && point < bounds.min) {
    return mixNumber(bounds.min, point, elastic.min);
  }

  if (bounds.max !== undefined && point > bounds.max) {
    return mixNumber(bounds.max, point, elastic.max);
  }

  return point;
};

const resolveConstraints = (
  constraints: MotionOptions["dragConstraints"],
  element: HTMLElement,
  onMeasureDragConstraints?: (
    constraints: DragConstraints,
  ) => DragConstraints | void,
): ResolvedConstraints | false => {
  if (!constraints) return false;

  let resolved: DragConstraints;

  if (constraints instanceof Element) {
    const parentRect = constraints.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    resolved = {
      top: parentRect.top - elementRect.top,
      left: parentRect.left - elementRect.left,
      right: parentRect.right - elementRect.right,
      bottom: parentRect.bottom - elementRect.bottom,
    };
  } else {
    resolved = constraints;
  }

  const userResolved = onMeasureDragConstraints?.(resolved);
  if (userResolved) {
    resolved = userResolved;
  }

  return {
    x: {
      min: resolved.left,
      max: resolved.right,
    },
    y: {
      min: resolved.top,
      max: resolved.bottom,
    },
  };
};

class VisualElementDragControls {
  private visualElement: VisualElement<HTMLElement>;
  private removeDidUpdateListener: VoidFunction = noop;
  private activePointerId: number | null = null;
  private openDragLock: VoidFunction | null = null;
  private currentDirection: DragAxis | null = null;
  private originPoint: Point = { x: 0, y: 0 };
  private startPoint: Point = { x: 0, y: 0 };
  private lastPoint: Point = { x: 0, y: 0 };
  private lastTime = 0;
  private latestPointerEvent: PointerEvent | null = null;
  private latestDragInfo: DragInfo | null = null;
  private velocity: Point = { x: 0, y: 0 };
  private constraints: ResolvedConstraints | false = false;
  private elastic: ResolvedElastic = resolveDragElastic(undefined);
  private dragStartOptions: DragControlOptions = {};
  isDragging = false;

  constructor(visualElement: VisualElement<HTMLElement>) {
    this.visualElement = visualElement;
  }

  addListeners(): VoidFunction | undefined {
    const element = this.visualElement.current;
    if (!(element instanceof HTMLElement)) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      const { drag, dragListener = true } = this.getProps();
      const target = event.target;
      const isClickingTextInputChild =
        target instanceof Element &&
        target !== element &&
        isElementTextInput(target);

      if (drag && dragListener && !isClickingTextInputChild) {
        this.start(event);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!this.isDragging) return;
      if (
        this.activePointerId !== null &&
        event.pointerId !== this.activePointerId
      ) {
        return;
      }

      const point = createPoint(event);
      const now = performance.now();
      const delta = {
        x: point.x - this.lastPoint.x,
        y: point.y - this.lastPoint.y,
      };
      const offset = {
        x: point.x - this.startPoint.x,
        y: point.y - this.startPoint.y,
      };
      const dt = now - this.lastTime;

      if (dt > 0) {
        this.velocity = {
          x: ((point.x - this.lastPoint.x) / dt) * 1000,
          y: ((point.y - this.lastPoint.y) / dt) * 1000,
        };
      }

      const info: DragInfo = {
        point,
        delta,
        offset,
        velocity: this.velocity,
      };

      this.latestPointerEvent = event;
      this.latestDragInfo = info;

      const {
        drag,
        dragPropagation,
        dragDirectionLock,
        onDirectionLock,
        onDrag,
      } = this.getProps();

      if (!dragPropagation && !this.openDragLock) return;

      if (dragDirectionLock && this.currentDirection === null) {
        this.currentDirection = getCurrentDirection(
          offset,
          this.dragStartOptions.distanceThreshold ?? 10,
        );

        if (this.currentDirection !== null) {
          onDirectionLock?.(this.currentDirection);
        } else {
          this.lastPoint = point;
          this.lastTime = now;
          return;
        }
      }

      this.updateAxis("x", offset, drag);
      this.updateAxis("y", offset, drag);

      this.visualElement.render();

      if (onDrag) {
        frame.update(() => onDrag(event, info), false, true);
      }

      this.lastPoint = point;
      this.lastTime = now;
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (
        this.activePointerId !== null &&
        event.pointerId !== this.activePointerId
      ) {
        return;
      }

      const finalInfo =
        this.latestDragInfo ??
        createDragInfo(
          createPoint(event),
          this.startPoint,
          this.lastPoint,
          this.velocity,
        );

      this.latestPointerEvent = event;
      this.latestDragInfo = finalInfo;

      this.stop(event, finalInfo);
      this.latestPointerEvent = null;
      this.latestDragInfo = null;
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerEnd);
    element.addEventListener("pointercancel", onPointerEnd);

    const projection = this.visualElement.projection;
    if (projection) {
      this.removeDidUpdateListener = projection.addEventListener(
        "didUpdate",
        (({ delta, hasLayoutChanged }: LayoutUpdateData) => {
          if (!this.isDragging || !hasLayoutChanged) return;

          (["x", "y"] as const).forEach((axis) => {
            const motionValue = this.getAxisMotionValue(axis);
            const current = motionValue.get();
            if (typeof current !== "number") return;

            this.originPoint[axis] += delta[axis].translate;
            motionValue.set(current + delta[axis].translate);
          });

          this.visualElement.render();
        }) as never,
      );
    }

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerEnd);
      element.removeEventListener("pointercancel", onPointerEnd);
      this.removeDidUpdateListener();
      this.removeDidUpdateListener = noop;
    };
  }

  start(originEvent: PointerEvent, options: DragControlOptions = {}) {
    const { presenceContext } = this.visualElement;
    if (presenceContext && presenceContext.isPresent === false) return;

    const element = this.visualElement.current;
    if (!(element instanceof HTMLElement)) return;

    const { drag, dragPropagation, onDragStart } = this.getProps();
    if (!drag) return;

    if (!dragPropagation) {
      this.openDragLock?.();
      this.openDragLock = setDragLock(dragDirectionToLock(drag));
      if (!this.openDragLock) return;
    }

    this.dragStartOptions = options;
    if (options.snapToCursor) {
      this.snapToCursor(createPoint(originEvent));
    }

    this.stopAnimation();

    this.isDragging = true;
    this.currentDirection = null;
    this.activePointerId = originEvent.pointerId;
    this.startPoint = createPoint(originEvent);
    this.lastPoint = this.startPoint;
    this.lastTime = performance.now();
    this.velocity = { x: 0, y: 0 };
    this.latestPointerEvent = originEvent;
    this.latestDragInfo = createDragInfo(
      this.startPoint,
      this.startPoint,
      this.startPoint,
      this.velocity,
    );
    this.constraints = resolveConstraints(
      this.getProps().dragConstraints,
      element,
      this.getProps().onMeasureDragConstraints as
        | ((constraints: DragConstraints) => DragConstraints | void)
        | undefined,
    );
    this.elastic = resolveDragElastic(this.getProps().dragElastic);

    if (this.visualElement.projection) {
      this.visualElement.projection.isAnimationBlocked = true;
      this.visualElement.projection.target = undefined;
    }

    (["x", "y"] as const).forEach((axis) => {
      let current = this.getAxisMotionValue(axis).get() ?? 0;

      if (
        typeof current === "string" &&
        percent.test(current) &&
        this.visualElement.projection?.layout
      ) {
        const measuredAxis =
          this.visualElement.projection.layout.layoutBox[axis];
        const length = calcAxisLength(measuredAxis.min, measuredAxis.max);
        current = length * (parseFloat(current) / 100);
      }

      this.originPoint[axis] =
        typeof current === "number"
          ? current
          : Number.parseFloat(String(current)) || 0;
    });

    try {
      element.setPointerCapture(originEvent.pointerId);
    } catch {
      // Pointer capture isn't available in every environment.
    }

    if (onDragStart && this.latestDragInfo) {
      frame.update(
        () => onDragStart(originEvent, this.latestDragInfo!),
        false,
        true,
      );
    }

    addValueToWillChange(this.visualElement, "transform");
    this.visualElement.animationState?.setActive("whileDrag", true);
  }

  stop(event?: PointerEvent, info?: DragInfo) {
    const finalEvent = event ?? this.latestPointerEvent;
    const finalInfo = info ?? this.latestDragInfo;
    const wasDragging = this.isDragging;

    this.cancel();
    if (!wasDragging || !finalEvent || !finalInfo) return;

    const { onDragEnd } = this.getProps();
    const animation = this.startAnimation(finalInfo.velocity);

    if (onDragEnd) {
      frame.postRender(() => onDragEnd(finalEvent, finalInfo));
    }

    return animation;
  }

  cancel() {
    const element = this.visualElement.current;

    this.isDragging = false;
    this.currentDirection = null;

    if (
      element instanceof HTMLElement &&
      this.activePointerId !== null &&
      element.hasPointerCapture(this.activePointerId)
    ) {
      try {
        element.releasePointerCapture(this.activePointerId);
      } catch {
        // Pointer capture may already be released.
      }
    }

    this.activePointerId = null;

    if (this.visualElement.projection) {
      this.visualElement.projection.isAnimationBlocked = false;
    }

    if (!this.getProps().dragPropagation && this.openDragLock) {
      this.openDragLock();
      this.openDragLock = null;
    }

    this.visualElement.animationState?.setActive("whileDrag", false);
  }

  private updateAxis(
    axis: DragAxis,
    offset: Point,
    drag: MotionOptions["drag"],
  ) {
    if (!shouldDrag(axis, drag, this.currentDirection)) return;

    const axisValue = this.getAxisMotionValue(axis);
    const current = axisValue.get();
    const start = this.originPoint[axis];

    let next = start + offset[axis];
    if (this.constraints && this.constraints[axis]) {
      next = applyConstraints(next, this.constraints[axis], this.elastic[axis]);
    }

    if (current !== next) {
      axisValue.set(next);
    }
  }

  private startAnimation(velocity: Point) {
    const {
      drag,
      dragMomentum,
      dragElastic,
      dragTransition,
      dragSnapToOrigin,
      onDragTransitionEnd,
    } = this.getProps();

    const animations = (["x", "y"] as const)
      .map((axis) => {
        if (!shouldDrag(axis, drag, this.currentDirection)) return undefined;

        let axisBounds = this.constraints ? this.constraints[axis] : {};
        if (dragSnapToOrigin) {
          axisBounds = { min: 0, max: 0 };
        }

        const transition: Transition = {
          type: "inertia",
          velocity: dragMomentum === false ? 0 : velocity[axis],
          bounceStiffness: dragElastic ? 200 : 1_000_000,
          bounceDamping: dragElastic ? 40 : 10_000_000,
          timeConstant: 750,
          restDelta: 1,
          restSpeed: 10,
          ...(dragTransition ?? {}),
          ...axisBounds,
        };

        return this.startAxisValueAnimation(axis, transition);
      })
      .filter((value): value is Promise<void> => value !== undefined);

    return Promise.all(animations).then(() => {
      onDragTransitionEnd?.();
    });
  }

  private startAxisValueAnimation(axis: DragAxis, transition: Transition) {
    const axisValue = this.getAxisMotionValue(axis);
    addValueToWillChange(this.visualElement, axis);

    return axisValue.start(animateMotionValue(axis, axisValue, 0, transition));
  }

  private stopAnimation() {
    (["x", "y"] as const).forEach((axis) =>
      this.getAxisMotionValue(axis).stop(),
    );
  }

  private getAxisMotionValue(axis: DragAxis): MotionValue<number | string> {
    const dragKey = axis === "x" ? "_dragX" : "_dragY";
    const props = this.getProps();
    const external = props[dragKey];

    if (isMotionValue(external)) {
      const existing = this.visualElement.getValue(axis);
      if (existing !== external) {
        this.visualElement.addValue(axis, external);
      }
      return external as MotionValue<number | string>;
    }

    return this.visualElement.getValue(
      axis,
      this.getInitialAxisValue(axis),
    ) as MotionValue<number | string>;
  }

  private getInitialAxisValue(axis: DragAxis) {
    const { initial } = this.getProps();

    if (
      initial &&
      typeof initial === "object" &&
      !Array.isArray(initial) &&
      typeof initial !== "function" &&
      axis in initial
    ) {
      const value = initial[axis as keyof typeof initial];
      if (typeof value === "number" || typeof value === "string") {
        return value;
      }
    }

    return 0;
  }

  private snapToCursor(point: Point) {
    const projection = this.visualElement.projection;
    if (!projection?.layout) return;

    (["x", "y"] as const).forEach((axis) => {
      if (!shouldDrag(axis, this.getProps().drag, this.currentDirection))
        return;

      const axisValue = this.getAxisMotionValue(axis);
      const { min, max } = projection.layout.layoutBox[axis];
      const current = axisValue.get();
      const numericCurrent =
        typeof current === "number"
          ? current
          : Number.parseFloat(String(current)) || 0;

      axisValue.set(point[axis] - mixNumber(min, max, 0.5) + numericCurrent);
    });
  }

  private getProps(): MotionOptions {
    const props = this.visualElement.getProps() as MotionOptions;
    const {
      drag = false,
      dragDirectionLock = false,
      dragPropagation = false,
      dragConstraints = false,
      dragElastic = defaultElastic,
      dragMomentum = true,
    } = props;

    return {
      ...props,
      drag,
      dragDirectionLock,
      dragPropagation,
      dragConstraints,
      dragElastic,
      dragMomentum,
    };
  }
}

const dragDirectionToLock = (drag: MotionOptions["drag"]) =>
  drag === "x" || drag === "y" ? drag : true;

const calcAxisLength = (min: number, max: number) => max - min;

export class DragFeature extends Feature<HTMLElement> {
  controls: VisualElementDragControls;
  private removeGroupControls: VoidFunction = noop;
  private removeListeners: VoidFunction = noop;

  constructor(node: VisualElement<HTMLElement>) {
    super(node);
    this.controls = new VisualElementDragControls(node);
  }

  override mount() {
    const { dragControls } = this.node.getProps() as MotionOptions;
    const controller = dragControls as InternalDragControls | undefined;

    if (controller?.subscribe) {
      this.removeGroupControls = controller.subscribe(this.controls);
    }

    this.removeListeners = this.controls.addListeners() ?? noop;
  }

  override update() {
    const { dragControls } = this.node.getProps() as MotionOptions;
    const prevDragControls = (this.node.prevProps as MotionOptions | undefined)
      ?.dragControls as InternalDragControls | undefined;
    const controller = dragControls as InternalDragControls | undefined;

    if (controller !== prevDragControls) {
      this.removeGroupControls();
      this.removeGroupControls = controller?.subscribe?.(this.controls) ?? noop;
    }
  }

  override unmount() {
    this.removeGroupControls();
    this.removeListeners();
    this.controls.cancel();
  }
}
