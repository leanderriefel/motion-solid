import { createEffect, onCleanup } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { MotionOptions, MotionState } from "../types";

export interface GestureOptions {
  state: MotionState;
  setState: SetStoreFunction<MotionState>;
  options: MotionOptions;
}

/**
 * Create EventInfo from a mouse/pointer event
 */
const createEventInfo = (event: MouseEvent | PointerEvent) => ({
  point: { x: event.clientX, y: event.clientY },
});

/**
 * Create TapInfo from a pointer event
 */
const createTapInfo = (event: PointerEvent) => ({
  point: { x: event.clientX, y: event.clientY },
});

interface Point {
  x: number;
  y: number;
}

interface PanInfo {
  point: Point;
  delta: Point;
  offset: Point;
  velocity: Point;
}

/**
 * Create PanInfo from current pan state
 */
const createPanInfo = (
  point: Point,
  delta: Point,
  offset: Point,
  velocity: Point,
): PanInfo => ({
  point,
  delta,
  offset,
  velocity,
});

export const useGestures = (args: GestureOptions) => {
  createEffect(() => {
    if (typeof document === "undefined") return;

    const { state, setState, options } = args;

    const element = state.element;

    if (!element) return;

    // Add event listeners - cast element to HTMLElement for proper event types
    const htmlElement = element as HTMLElement;

    // Hover gestures
    const onMouseEnter = (event: MouseEvent) => {
      setState("activeGestures", "hover", true);
      options.onHoverStart?.(event, createEventInfo(event));
    };

    const onMouseLeave = (event: MouseEvent) => {
      setState("activeGestures", "hover", false);
      options.onHoverEnd?.(event, createEventInfo(event));
    };

    // Tap gestures - use pointerdown/pointerup for better touch support
    let isTapping = false;

    // Pan gesture state
    let isPanning = false;
    let panSessionStarted = false;
    let panStartPoint: Point = { x: 0, y: 0 };
    let panLastPoint: Point = { x: 0, y: 0 };
    let panLastTime = 0;
    let panVelocity: Point = { x: 0, y: 0 };
    const hasPanHandlers =
      options.onPan ||
      options.onPanStart ||
      options.onPanSessionStart ||
      options.onPanEnd;

    // Determine where to listen for tap events
    const tapTarget = options.globalTapTarget ? document : htmlElement;

    const onPointerDown = (event: PointerEvent) => {
      isTapping = true;
      setState("activeGestures", "tap", true);
      options.onTapStart?.(event, createTapInfo(event));

      // Initialize pan session if we have pan handlers
      if (hasPanHandlers) {
        panSessionStarted = true;
        isPanning = false;
        panStartPoint = { x: event.clientX, y: event.clientY };
        panLastPoint = panStartPoint;
        panLastTime = performance.now();
        panVelocity = { x: 0, y: 0 };

        options.onPanSessionStart?.(
          event,
          createPanInfo(
            panStartPoint,
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
          ),
        );
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!panSessionStarted) return;

      const point: Point = { x: event.clientX, y: event.clientY };
      const now = performance.now();
      const dt = now - panLastTime;

      // Calculate velocity
      if (dt > 0) {
        panVelocity = {
          x: ((point.x - panLastPoint.x) / dt) * 1000,
          y: ((point.y - panLastPoint.y) / dt) * 1000,
        };
      }

      const delta: Point = {
        x: point.x - panLastPoint.x,
        y: point.y - panLastPoint.y,
      };
      const offset: Point = {
        x: point.x - panStartPoint.x,
        y: point.y - panStartPoint.y,
      };

      // Start pan if we haven't already (first move after pointer down)
      if (!isPanning) {
        isPanning = true;
        options.onPanStart?.(
          event,
          createPanInfo(point, delta, offset, panVelocity),
        );
      }

      options.onPan?.(event, createPanInfo(point, delta, offset, panVelocity));

      panLastPoint = point;
      panLastTime = now;
    };

    const onPointerUp = (event: PointerEvent) => {
      // End pan gesture if active
      if (panSessionStarted) {
        const point: Point = { x: event.clientX, y: event.clientY };
        const offset: Point = {
          x: point.x - panStartPoint.x,
          y: point.y - panStartPoint.y,
        };

        if (isPanning) {
          options.onPanEnd?.(
            event,
            createPanInfo(
              point,
              { x: 0, y: 0 }, // delta is 0 at end
              offset,
              panVelocity,
            ),
          );
        }

        panSessionStarted = false;
        isPanning = false;
      }

      if (!isTapping) return;
      isTapping = false;
      setState("activeGestures", "tap", false);

      // Check if pointer is still over the element for onTap vs onTapCancel
      const rect = element.getBoundingClientRect();
      const isInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (isInside) {
        options.onTap?.(event, createTapInfo(event));
      } else {
        options.onTapCancel?.(event, createTapInfo(event));
      }
    };

    const onPointerCancel = (event: PointerEvent) => {
      // End pan gesture on cancel
      if (panSessionStarted) {
        const point: Point = { x: event.clientX, y: event.clientY };
        const offset: Point = {
          x: point.x - panStartPoint.x,
          y: point.y - panStartPoint.y,
        };

        if (isPanning) {
          options.onPanEnd?.(
            event,
            createPanInfo(point, { x: 0, y: 0 }, offset, panVelocity),
          );
        }

        panSessionStarted = false;
        isPanning = false;
      }

      if (!isTapping) return;
      isTapping = false;
      setState("activeGestures", "tap", false);
      options.onTapCancel?.(event, createTapInfo(event));
    };

    // Focus gestures
    const onFocus = () => {
      setState("activeGestures", "focus", true);
    };

    const onBlur = () => {
      setState("activeGestures", "focus", false);
    };

    // Viewport gestures
    let wasInView = false;

    // Handle viewport.root which can be a ref object or element
    const viewportRoot = options.viewport?.root;
    const resolvedRoot =
      viewportRoot &&
      typeof viewportRoot === "object" &&
      "current" in viewportRoot
        ? viewportRoot.current
        : ((viewportRoot as Element | Document | null | undefined) ?? null);

    // Resolve threshold from amount option
    // Supports "all" (1), "some" (0), or numeric values 0-1
    const resolveThreshold = (
      amount: "all" | "some" | number | undefined,
    ): number => {
      if (amount === "all") return 1;
      if (typeof amount === "number") return Math.max(0, Math.min(1, amount));
      return 0; // "some" or undefined
    };

    const io = new IntersectionObserver(
      (entries) => {
        const isInView = entries.some((entry) => entry.isIntersecting);
        setState("activeGestures", "inView", isInView);

        const entry = entries[0];
        if (entry) {
          if (isInView && !wasInView) {
            options.onViewportEnter?.(entry);

            // Disconnect after first intersection if once is true
            if (options.viewport?.once) {
              io.disconnect();
            }
          } else if (!isInView && wasInView) {
            options.onViewportLeave?.(entry);
          }
        }
        wasInView = isInView;
      },
      {
        root: resolvedRoot,
        rootMargin: options.viewport?.margin,
        threshold: resolveThreshold(options.viewport?.amount),
      },
    );

    // Add event listeners
    htmlElement.addEventListener("mouseenter", onMouseEnter);
    htmlElement.addEventListener("mouseleave", onMouseLeave);

    // Use tapTarget for pointerdown (element or document based on globalTapTarget)
    tapTarget.addEventListener("pointerdown", onPointerDown as EventListener);

    // Listen on document for pointer move/up/cancel to handle gestures outside element
    document.addEventListener("pointermove", onPointerMove as EventListener);
    document.addEventListener("pointerup", onPointerUp as EventListener);
    document.addEventListener(
      "pointercancel",
      onPointerCancel as EventListener,
    );
    htmlElement.addEventListener("focus", onFocus);
    htmlElement.addEventListener("blur", onBlur);

    io.observe(element);

    onCleanup(() => {
      htmlElement.removeEventListener("mouseenter", onMouseEnter);
      htmlElement.removeEventListener("mouseleave", onMouseLeave);
      tapTarget.removeEventListener(
        "pointerdown",
        onPointerDown as EventListener,
      );
      document.removeEventListener(
        "pointermove",
        onPointerMove as EventListener,
      );
      document.removeEventListener("pointerup", onPointerUp as EventListener);
      document.removeEventListener(
        "pointercancel",
        onPointerCancel as EventListener,
      );
      htmlElement.removeEventListener("focus", onFocus);
      htmlElement.removeEventListener("blur", onBlur);
      io.disconnect();
    });
  });
};
