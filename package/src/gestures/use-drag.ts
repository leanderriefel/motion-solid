import { createEffect, onCleanup } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { MotionValue, Transition } from "motion-dom";
import { motionValue } from "motion-dom";
import type { MotionOptions, MotionState } from "../types";
import { startMotionValueAnimation } from "../animation/motion-value";

export interface DragGestureOptions {
  state: MotionState;
  setState: SetStoreFunction<MotionState>;
  options: MotionOptions;
}

interface Point {
  x: number;
  y: number;
}

interface DragInfo {
  point: Point;
  delta: Point;
  offset: Point;
  velocity: Point;
}

interface DragConstraints {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

/**
 * DragControls interface for programmatic drag control
 */
export interface DragControls {
  /**
   * Start a drag gesture programmatically
   */
  start: (event: PointerEvent, options?: { snapToCursor?: boolean }) => void;
}

/**
 * Create a DragControls object for programmatic drag control
 */
export const createDragControls = (): DragControls => {
  const subscribers = new Set<
    (event: PointerEvent, options?: { snapToCursor?: boolean }) => void
  >();

  return {
    start: (event: PointerEvent, options?: { snapToCursor?: boolean }) => {
      // Notify all subscribers (draggable elements) about the programmatic drag start
      for (const subscriber of subscribers) {
        subscriber(event, options);
      }
    },
    // Internal method to allow elements to subscribe
    _subscribe: (
      callback: (
        event: PointerEvent,
        options?: { snapToCursor?: boolean },
      ) => void,
    ): (() => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  } as DragControls & {
    _subscribe: (
      callback: (
        event: PointerEvent,
        options?: { snapToCursor?: boolean },
      ) => void,
    ) => () => void;
  };
};

/**
 * Apply elastic effect to a value that exceeds constraints
 */
const applyElastic = (
  value: number,
  min: number | undefined,
  max: number | undefined,
  elastic: number,
): number => {
  if (min !== undefined && value < min) {
    const overshoot = min - value;
    return min - overshoot * elastic;
  }
  if (max !== undefined && value > max) {
    const overshoot = value - max;
    return max + overshoot * elastic;
  }
  return value;
};

/**
 * Get the constraints as pixel values
 */
const resolveConstraints = (
  constraints: DragConstraints | Element | undefined,
  element: Element,
  onMeasureDragConstraints?: (
    constraints: DragConstraints,
  ) => DragConstraints | void,
): DragConstraints | null => {
  if (!constraints) return null;

  let resolved: DragConstraints;

  // If it's a ref to an element, calculate relative constraints
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
    resolved = constraints as DragConstraints;
  }

  // Call onMeasureDragConstraints callback if provided
  if (onMeasureDragConstraints) {
    const result = onMeasureDragConstraints(resolved);
    // If the callback returns modified constraints, use them
    if (result) {
      resolved = result;
    }
  }

  return resolved;
};

/**
 * Clamp a value to constraints
 */
const clampToConstraints = (
  value: number,
  min: number | undefined,
  max: number | undefined,
): number => {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
};

export const useDragGesture = (args: DragGestureOptions) => {
  createEffect(() => {
    if (typeof document === "undefined") return;

    const { state, setState, options } = args;
    const element = state.element;

    // Only enable drag if drag prop is set
    const dragEnabled = options.drag;
    if (!dragEnabled || !element) return;

    type MotionValueOwner = NonNullable<MotionValue<unknown>["owner"]>;
    const owner: MotionValueOwner = {
      current: element,
      getProps: () => options,
    };

    const dragX = options.drag === true || options.drag === "x";
    const dragY = options.drag === true || options.drag === "y";

    // Use external motion values if provided (_dragX, _dragY), otherwise create/get internal ones
    let mvX: MotionValue<number> | undefined;
    let mvY: MotionValue<number> | undefined;

    // Check for external motion values
    const externalMvX = options._dragX as MotionValue<number> | undefined;
    const externalMvY = options._dragY as MotionValue<number> | undefined;

    if (dragX) {
      if (externalMvX) {
        mvX = externalMvX;
        // Store in state values so animations can access it
        setState("values", "x", mvX);
      } else {
        mvX = state.values.x as MotionValue<number> | undefined;
        if (!mvX) {
          mvX = motionValue(0, { owner });
          setState("values", "x", mvX);
        }
      }
    }

    if (dragY) {
      if (externalMvY) {
        mvY = externalMvY;
        setState("values", "y", mvY);
      } else {
        mvY = state.values.y as MotionValue<number> | undefined;
        if (!mvY) {
          mvY = motionValue(0, { owner });
          setState("values", "y", mvY);
        }
      }
    }

    // Drag state
    let isDragging = false;
    let startPoint: Point = { x: 0, y: 0 };
    let startValues: Point = { x: 0, y: 0 };
    let lastPoint: Point = { x: 0, y: 0 };
    let lastTime = 0;
    let velocity: Point = { x: 0, y: 0 };
    let lockedDirection: "x" | "y" | null = null;
    let activePointerId: number | null = null;

    // Options
    const elastic =
      typeof options.dragElastic === "number" ? options.dragElastic : 0.5;
    const momentum = options.dragMomentum !== false;
    const directionLock = options.dragDirectionLock === true;
    const snapToOrigin = options.dragSnapToOrigin === true;
    // dragPropagation: if false (default), stop propagation to prevent parent draggables from activating
    const propagateDrag = options.dragPropagation === true;

    const createDragInfo = (point: Point): DragInfo => ({
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

    const updateVelocity = (point: Point) => {
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) {
        velocity = {
          x: ((point.x - lastPoint.x) / dt) * 1000,
          y: ((point.y - lastPoint.y) / dt) * 1000,
        };
      }
      lastPoint = point;
      lastTime = now;
    };

    const startDrag = (
      event: PointerEvent,
      programmaticOptions?: { snapToCursor?: boolean },
    ) => {
      if (options.dragListener === false && !programmaticOptions) return;

      // Only respond to primary button for normal events
      if (!programmaticOptions && event.button !== 0) return;

      isDragging = true;
      activePointerId = event.pointerId;
      lockedDirection = null;

      const point = { x: event.clientX, y: event.clientY };

      // For snapToCursor, center the element on the cursor
      if (programmaticOptions?.snapToCursor) {
        const rect = element.getBoundingClientRect();
        const centerOffset = {
          x: event.clientX - (rect.left + rect.width / 2),
          y: event.clientY - (rect.top + rect.height / 2),
        };
        if (mvX) mvX.set(mvX.get() + centerOffset.x);
        if (mvY) mvY.set(mvY.get() + centerOffset.y);
      }

      startPoint = point;
      lastPoint = startPoint;
      lastTime = performance.now();
      velocity = { x: 0, y: 0 };
      startValues = {
        x: mvX?.get() ?? 0,
        y: mvY?.get() ?? 0,
      };

      setState("activeGestures", "drag", true);

      // Capture pointer for reliable tracking
      element.setPointerCapture(event.pointerId);

      options.onDragStart?.(event, createDragInfo(startPoint));
    };

    const onPointerDown = (event: PointerEvent) => {
      // Stop propagation to prevent parent draggables from activating
      if (!propagateDrag) {
        event.stopPropagation();
      }

      startDrag(event);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) return;
      // Only respond to the pointer that started the drag
      if (activePointerId !== null && event.pointerId !== activePointerId)
        return;

      const point = { x: event.clientX, y: event.clientY };
      updateVelocity(point);

      let offsetX = point.x - startPoint.x;
      let offsetY = point.y - startPoint.y;

      // Handle direction locking
      if (directionLock && !lockedDirection) {
        const absX = Math.abs(offsetX);
        const absY = Math.abs(offsetY);
        const threshold = 10;

        if (absX > threshold || absY > threshold) {
          lockedDirection = absX > absY ? "x" : "y";
          options.onDirectionLock?.(lockedDirection);
        }
      }

      // Apply direction lock
      if (lockedDirection === "x") offsetY = 0;
      if (lockedDirection === "y") offsetX = 0;

      // Calculate new values
      let newX = startValues.x + offsetX;
      let newY = startValues.y + offsetY;

      // Get constraints (with onMeasureDragConstraints callback)
      const constraints = resolveConstraints(
        options.dragConstraints as DragConstraints | Element,
        element,
        options.onMeasureDragConstraints as
          | ((constraints: DragConstraints) => DragConstraints | void)
          | undefined,
      );

      // Apply elastic effect at boundaries
      if (constraints && elastic > 0) {
        if (dragX) {
          newX = applyElastic(
            newX,
            constraints.left,
            constraints.right,
            elastic,
          );
        }
        if (dragY) {
          newY = applyElastic(
            newY,
            constraints.top,
            constraints.bottom,
            elastic,
          );
        }
      }

      // Update motion values
      if (dragX && mvX) mvX.set(newX);
      if (dragY && mvY) mvY.set(newY);

      options.onDrag?.(event, createDragInfo(point));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!isDragging) return;
      // Only respond to the pointer that started the drag
      if (activePointerId !== null && event.pointerId !== activePointerId)
        return;

      isDragging = false;
      activePointerId = null;
      setState("activeGestures", "drag", false);

      const point = { x: event.clientX, y: event.clientY };
      const info = createDragInfo(point);

      options.onDragEnd?.(event, info);

      // Get constraints for final position (with onMeasureDragConstraints callback)
      const constraints = resolveConstraints(
        options.dragConstraints as DragConstraints | Element,
        element,
        options.onMeasureDragConstraints as
          | ((constraints: DragConstraints) => DragConstraints | void)
          | undefined,
      );

      // Calculate final position
      let targetX = mvX?.get() ?? 0;
      let targetY = mvY?.get() ?? 0;

      if (snapToOrigin) {
        targetX = 0;
        targetY = 0;
      } else if (momentum) {
        // Apply momentum (inertia)
        const momentumDuration = 0.8;
        const deceleration = 0.95;

        if (dragX) {
          targetX = targetX + velocity.x * momentumDuration * deceleration;
        }
        if (dragY) {
          targetY = targetY + velocity.y * momentumDuration * deceleration;
        }
      }

      // Clamp to constraints
      if (constraints) {
        if (dragX) {
          targetX = clampToConstraints(
            targetX,
            constraints.left,
            constraints.right,
          );
        }
        if (dragY) {
          targetY = clampToConstraints(
            targetY,
            constraints.top,
            constraints.bottom,
          );
        }
      }

      // Animate to final position
      const transition: Transition = (options.dragTransition as Transition) ?? {
        type: "spring",
        stiffness: 400,
        damping: 40,
      };

      const transitionPromises: Array<Promise<unknown>> = [];

      if (dragX && mvX) {
        const currentX = mvX.get();
        if (currentX !== targetX) {
          const controls = startMotionValueAnimation({
            name: "x",
            motionValue: mvX as MotionValue<string | number>,
            keyframes: targetX,
            transition,
          });
          if (controls) transitionPromises.push(controls.finished);
        }
      }

      if (dragY && mvY) {
        const currentY = mvY.get();
        if (currentY !== targetY) {
          const controls = startMotionValueAnimation({
            name: "y",
            motionValue: mvY as MotionValue<string | number>,
            keyframes: targetY,
            transition,
          });
          if (controls) transitionPromises.push(controls.finished);
        }
      }

      if (transitionPromises.length > 0) {
        void Promise.allSettled(transitionPromises).then(() => {
          options.onDragTransitionEnd?.();
        });
      }
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (!isDragging) return;
      // Only respond to the pointer that started the drag
      if (activePointerId !== null && event.pointerId !== activePointerId)
        return;

      isDragging = false;
      activePointerId = null;
      setState("activeGestures", "drag", false);

      // Snap back to start position
      if (mvX) mvX.set(startValues.x);
      if (mvY) mvY.set(startValues.y);
    };

    // Subscribe to dragControls for programmatic drag start
    let unsubscribeDragControls: (() => void) | undefined;
    const dragControls = options.dragControls as
      | (DragControls & {
          _subscribe?: (
            callback: (
              event: PointerEvent,
              options?: { snapToCursor?: boolean },
            ) => void,
          ) => () => void;
        })
      | undefined;

    if (dragControls && typeof dragControls._subscribe === "function") {
      unsubscribeDragControls = dragControls._subscribe(startDrag);
    }

    // Add event listeners
    const htmlElement = element as HTMLElement;
    htmlElement.addEventListener("pointerdown", onPointerDown);
    htmlElement.addEventListener("pointermove", onPointerMove);
    htmlElement.addEventListener("pointerup", onPointerUp);
    htmlElement.addEventListener("pointercancel", onPointerCancel);

    // Prevent default drag behavior
    htmlElement.style.touchAction = "none";
    htmlElement.style.userSelect = "none";

    onCleanup(() => {
      htmlElement.removeEventListener("pointerdown", onPointerDown);
      htmlElement.removeEventListener("pointermove", onPointerMove);
      htmlElement.removeEventListener("pointerup", onPointerUp);
      htmlElement.removeEventListener("pointercancel", onPointerCancel);
      unsubscribeDragControls?.();
    });
  });
};
