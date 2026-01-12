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
const createTapInfo = (event: { clientX: number; clientY: number }) => ({
  point: { x: event.clientX, y: event.clientY },
});

const isPrimaryPointer = (event: PointerEvent): boolean => {
  if (event.pointerType === "mouse") {
    return typeof event.button !== "number" || event.button <= 0;
  }

  return event.isPrimary !== false;
};

const isNodeOrChild = (parent: Element, child: EventTarget | null): boolean => {
  if (!child || !(child instanceof Node)) return false;
  return parent === child || parent.contains(child);
};

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

    // Create AbortController for event listener cleanup
    const abortController = new AbortController();
    const { signal } = abortController;

    // Add event listeners - cast element to HTMLElement for proper event types
    const htmlElement = element as HTMLElement;

    // If tap handlers are present, ensure element is focusable so Enter can trigger tap.
    const prevTabIndexAttr = htmlElement.getAttribute("tabindex");
    const shouldMakeFocusable =
      prevTabIndexAttr === null &&
      (options.onTap ||
        options.onTapStart ||
        options.onTapCancel ||
        options.whileTap) &&
      htmlElement.tabIndex < 0;

    if (shouldMakeFocusable) {
      htmlElement.tabIndex = 0;
    }

    // Hover gestures
    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;

      setState("activeGestures", "hover", true);
      options.onHoverStart?.(event, createEventInfo(event));
    };

    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;

      setState("activeGestures", "hover", false);
      options.onHoverEnd?.(event, createEventInfo(event));
    };

    // Tap gestures - use pointerdown/pointerup for better touch support
    let isTapping = false;
    let tapSource: "pointer" | "keyboard" | null = null;

    const hasTapHandlers =
      options.onTap ||
      options.onTapStart ||
      options.onTapCancel ||
      options.whileTap;

    const getElementCenterPoint = () => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };

    const createSyntheticMouseEvent = (
      type: "mousedown" | "mouseup",
      point: { x: number; y: number },
    ) =>
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: point.x,
        clientY: point.y,
      });

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

    const useGlobalTapTarget = options.globalTapTarget === true;

    // Determine where to listen for tap events
    const tapTarget = useGlobalTapTarget ? window : htmlElement;

    const onPointerDown = (event: PointerEvent) => {
      if (!isPrimaryPointer(event)) return;

      const isOriginInside = isNodeOrChild(element, event.target);
      const shouldStartTap =
        hasTapHandlers && (useGlobalTapTarget || isOriginInside);
      const shouldStartPan = hasPanHandlers && isOriginInside;

      if (shouldStartTap) {
        isTapping = true;
        tapSource = "pointer";
        setState("activeGestures", "tap", true);
        options.onTapStart?.(event, createTapInfo(event));
      }

      // Initialize pan session if we have pan handlers
      if (shouldStartPan) {
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
      if (!isPrimaryPointer(event)) return;

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
      tapSource = null;
      setState("activeGestures", "tap", false);

      const shouldTriggerTap =
        useGlobalTapTarget || isNodeOrChild(element, event.target);

      if (shouldTriggerTap) {
        options.onTap?.(event, createTapInfo(event));
      } else {
        options.onTapCancel?.(event, createTapInfo(event));
      }
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (!isPrimaryPointer(event)) return;

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
      tapSource = null;
      setState("activeGestures", "tap", false);
      options.onTapCancel?.(event, createTapInfo(event));
    };

    // Focus gestures
    const onFocus = () => {
      setState("activeGestures", "focus", true);
    };

    const onBlur = () => {
      setState("activeGestures", "focus", false);

      if (!hasTapHandlers) return;
      if (!isTapping || tapSource !== "keyboard") return;

      isTapping = false;
      tapSource = null;
      setState("activeGestures", "tap", false);

      const point = getElementCenterPoint();
      const cancelEvent = createSyntheticMouseEvent("mouseup", point);
      options.onTapCancel?.(cancelEvent, createTapInfo(cancelEvent));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasTapHandlers) return;
      if (event.key !== "Enter") return;
      if (event.repeat) return;
      if (isTapping) return;

      isTapping = true;
      tapSource = "keyboard";
      setState("activeGestures", "tap", true);

      const point = getElementCenterPoint();
      const startEvent = createSyntheticMouseEvent("mousedown", point);
      options.onTapStart?.(startEvent, createTapInfo(startEvent));
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!hasTapHandlers) return;
      if (event.key !== "Enter") return;
      if (!isTapping || tapSource !== "keyboard") return;

      isTapping = false;
      tapSource = null;
      setState("activeGestures", "tap", false);

      const point = getElementCenterPoint();
      const endEvent = createSyntheticMouseEvent("mouseup", point);
      options.onTap?.(endEvent, createTapInfo(endEvent));
    };

    // Viewport gestures
    let wasInView = false;

    // viewport.root is a direct Element or Document reference (SolidJS style)
    const resolvedRoot =
      (options.viewport?.root as Element | Document | null) ?? null;

    // Resolve threshold from amount option
    // Supports "all" (1), "some" (0), or numeric values 0-1
    const resolveThreshold = (
      amount: "all" | "some" | number | undefined,
    ): number => {
      if (amount === "all") return 1;
      if (typeof amount === "number") return Math.max(0, Math.min(1, amount));
      return 0; // "some" or undefined
    };

    const threshold = resolveThreshold(options.viewport?.amount);

    let io: IntersectionObserver | null = null;

    if (typeof IntersectionObserver === "function") {
      io = new IntersectionObserver(
        (entries) => {
          const isInView = entries.some((entry) =>
            threshold > 0
              ? entry.intersectionRatio >= threshold
              : entry.isIntersecting,
          );
          setState("activeGestures", "inView", isInView);

          const entry = entries[0];
          if (entry) {
            if (isInView && !wasInView) {
              options.onViewportEnter?.(entry);

              // Disconnect after first intersection if once is true
              if (options.viewport?.once) {
                io?.disconnect();
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
          threshold,
        },
      );
    } else {
      setState("activeGestures", "inView", true);

      if (!wasInView) {
        wasInView = true;

        if (typeof options.onViewportEnter === "function") {
          const rect = element.getBoundingClientRect();
          const entry = {
            isIntersecting: true,
            intersectionRatio: 1,
            target: element,
            time: performance.now(),
            boundingClientRect: rect,
            intersectionRect: rect,
            rootBounds: null,
          } as IntersectionObserverEntry;

          options.onViewportEnter(entry);
        }
      }
    }

    htmlElement.addEventListener("pointerenter", onPointerEnter, { signal });
    htmlElement.addEventListener("pointerleave", onPointerLeave, { signal });

    // Use tapTarget for pointerdown (element or window based on globalTapTarget)
    tapTarget.addEventListener("pointerdown", onPointerDown as EventListener, {
      signal,
    });

    // Listen on document for pointer move/up/cancel to handle gestures outside element
    document.addEventListener("pointermove", onPointerMove as EventListener, {
      signal,
    });
    document.addEventListener("pointerup", onPointerUp as EventListener, {
      signal,
    });
    document.addEventListener(
      "pointercancel",
      onPointerCancel as EventListener,
      { signal },
    );
    htmlElement.addEventListener("focus", onFocus, { signal });
    htmlElement.addEventListener("blur", onBlur, { signal });
    htmlElement.addEventListener("keydown", onKeyDown, { signal });
    htmlElement.addEventListener("keyup", onKeyUp, { signal });

    io?.observe(element);

    onCleanup(() => {
      abortController.abort();
      io?.disconnect();

      if (shouldMakeFocusable) {
        // Restore original focusability (avoid leaving a `tabindex` attribute behind)
        if (prevTabIndexAttr === null) {
          htmlElement.removeAttribute("tabindex");
        }
      }
    });
  });
};
