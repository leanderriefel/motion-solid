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

export const useGestures = (args: GestureOptions) => {
  createEffect(() => {
    if (typeof document === "undefined") return;

    const { state, setState, options } = args;

    const element = state.element;

    if (!element) return;

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

    const onPointerDown = (event: PointerEvent) => {
      isTapping = true;
      setState("activeGestures", "tap", true);
      options.onTapStart?.(event, createTapInfo(event));
    };

    const onPointerUp = (event: PointerEvent) => {
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

    const io = new IntersectionObserver(
      (entries) => {
        const isInView = entries.some((entry) => entry.isIntersecting);
        setState("activeGestures", "inView", isInView);

        const entry = entries[0];
        if (entry) {
          if (isInView && !wasInView) {
            options.onViewportEnter?.(entry);
          } else if (!isInView && wasInView) {
            options.onViewportLeave?.(entry);
          }
        }
        wasInView = isInView;
      },
      {
        root: resolvedRoot,
        rootMargin: options.viewport?.margin,
        threshold: options.viewport?.amount === "all" ? 1 : 0,
      },
    );

    // Add event listeners - cast element to HTMLElement for proper event types
    const htmlElement = element as HTMLElement;
    htmlElement.addEventListener("mouseenter", onMouseEnter);
    htmlElement.addEventListener("mouseleave", onMouseLeave);
    htmlElement.addEventListener("pointerdown", onPointerDown);
    // Listen on document for pointer up to handle release outside element
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
    htmlElement.addEventListener("focus", onFocus);
    htmlElement.addEventListener("blur", onBlur);

    io.observe(element);

    onCleanup(() => {
      htmlElement.removeEventListener("mouseenter", onMouseEnter);
      htmlElement.removeEventListener("mouseleave", onMouseLeave);
      htmlElement.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
      htmlElement.removeEventListener("focus", onFocus);
      htmlElement.removeEventListener("blur", onBlur);
      io.disconnect();
    });
  });
};
