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
  constraints: DragConstraints | { current: Element } | undefined,
  element: Element,
): DragConstraints | null => {
  if (!constraints) return null;

  // If it's a ref to an element, calculate relative constraints
  if ("current" in constraints && constraints.current instanceof Element) {
    const parentRect = constraints.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    return {
      top: parentRect.top - elementRect.top,
      left: parentRect.left - elementRect.left,
      right: parentRect.right - elementRect.right,
      bottom: parentRect.bottom - elementRect.bottom,
    };
  }

  return constraints as DragConstraints;
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

    const dragX = options.drag === true || options.drag === "x";
    const dragY = options.drag === true || options.drag === "y";

    // Get or create motion values for x and y
    let mvX = state.values.x as MotionValue<number> | undefined;
    let mvY = state.values.y as MotionValue<number> | undefined;

    if (!mvX && dragX) {
      mvX = motionValue(0);
      setState("values", "x", mvX);
    }
    if (!mvY && dragY) {
      mvY = motionValue(0);
      setState("values", "y", mvY);
    }

    // Drag state
    let isDragging = false;
    let startPoint: Point = { x: 0, y: 0 };
    let startValues: Point = { x: 0, y: 0 };
    let lastPoint: Point = { x: 0, y: 0 };
    let lastTime = 0;
    let velocity: Point = { x: 0, y: 0 };
    let lockedDirection: "x" | "y" | null = null;

    // Options
    const elastic =
      typeof options.dragElastic === "number" ? options.dragElastic : 0.5;
    const momentum = options.dragMomentum !== false;
    const directionLock = options.dragDirectionLock === true;
    const snapToOrigin = options.dragSnapToOrigin === true;

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

    const onPointerDown = (event: PointerEvent) => {
      if (options.dragListener === false) return;

      // Only respond to primary button
      if (event.button !== 0) return;

      isDragging = true;
      lockedDirection = null;
      startPoint = { x: event.clientX, y: event.clientY };
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

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) return;

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

      // Get constraints
      const constraints = resolveConstraints(
        options.dragConstraints as DragConstraints | { current: Element },
        element,
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

      isDragging = false;
      setState("activeGestures", "drag", false);

      const point = { x: event.clientX, y: event.clientY };
      const info = createDragInfo(point);

      options.onDragEnd?.(event, info);

      // Get constraints for final position
      const constraints = resolveConstraints(
        options.dragConstraints as DragConstraints | { current: Element },
        element,
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

      if (dragX && mvX) {
        const currentX = mvX.get();
        if (currentX !== targetX) {
          const controls = startMotionValueAnimation({
            name: "x",
            motionValue: mvX as MotionValue<string | number>,
            keyframes: targetX,
            transition,
          });
          controls?.finished.then(() => {
            options.onDragTransitionEnd?.();
          });
        }
      }

      if (dragY && mvY) {
        const currentY = mvY.get();
        if (currentY !== targetY) {
          startMotionValueAnimation({
            name: "y",
            motionValue: mvY as MotionValue<string | number>,
            keyframes: targetY,
            transition,
          });
        }
      }
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (!isDragging) return;

      isDragging = false;
      setState("activeGestures", "drag", false);

      // Snap back to start position
      if (mvX) mvX.set(startValues.x);
      if (mvY) mvY.set(startValues.y);
    };

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
    });
  });
};
