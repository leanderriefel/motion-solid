import {
  DOMKeyframesResolver,
  motionValue,
  frame,
  frameData,
} from "motion-dom";
import type { MotionValue } from "motion-dom";
import type { Box } from "motion-utils";

/**
 * WithRender interface expected by DOMKeyframesResolver.
 * This matches the interface from motion-dom.
 */
export interface WithRender {
  render: () => void;
  readValue: (name: string, keyframe: unknown) => unknown;
  getValue: (name: string, defaultValue?: unknown) => MotionValue | undefined;
  current?: HTMLElement | SVGElement;
  measureViewportBox: () => Box;
  KeyframeResolver?: typeof DOMKeyframesResolver;
}

/**
 * MotionElement wraps a DOM element and provides the WithRender interface
 * required by motion-dom's DOMKeyframesResolver for proper keyframe resolution.
 *
 * This enables:
 * - CSS variable animation
 * - Unit type conversion (%, vh, vw -> px)
 * - "none" value animation
 * - "auto" size animations with batched DOM measurements
 */
export class MotionElement implements WithRender {
  current: HTMLElement | SVGElement;
  KeyframeResolver = DOMKeyframesResolver;

  private values: Record<string, MotionValue<unknown>>;
  private renderFn: () => void;
  private postMeasureRenderScheduled = false;

  constructor(
    element: HTMLElement | SVGElement,
    values: Record<string, MotionValue<unknown>>,
    render: () => void,
  ) {
    this.current = element;
    this.values = values;
    this.renderFn = render;
  }

  /**
   * Force-render all pending MotionValue changes to the DOM.
   * Called by DOMKeyframesResolver during measurement phases.
   *
   * After rendering, schedules a "post-measure flush" to restore the DOM
   * to its proper state (e.g. after motion-dom temporarily sets width/height
   * to "auto" for measurement). This ensures the measuring state is never
   * visible to the user, preventing flash during "auto" size animations.
   */
  render(): void {
    this.renderFn();

    if (this.postMeasureRenderScheduled) return;
    this.postMeasureRenderScheduled = true;

    const flush = () => {
      if (!this.postMeasureRenderScheduled) return;
      this.postMeasureRenderScheduled = false;
      this.renderFn();
    };

    if (frameData.isProcessing) {
      frame.resolveKeyframes(flush, false, true);
    } else if (typeof queueMicrotask === "function") {
      queueMicrotask(flush);
    } else {
      Promise.resolve().then(flush);
    }
  }

  /**
   * Read a computed style value from the DOM element.
   * Returns fallback if the value is empty, "none", or "auto".
   */
  readValue(name: string, fallback: unknown): unknown {
    if (!this.current || typeof window === "undefined") {
      return fallback;
    }

    const computed = window.getComputedStyle(this.current);

    // Handle CSS variables
    if (name.startsWith("--")) {
      const value = computed.getPropertyValue(name);
      if (!value || value === "") {
        return fallback;
      }
      return value;
    }

    // Handle standard CSS properties
    const value = computed.getPropertyValue(name);
    if (!value || value === "none" || value === "auto") {
      return fallback;
    }
    return value;
  }

  /**
   * Get a MotionValue for a property, creating one if needed.
   * Used by DOMKeyframesResolver to track animation values.
   */
  getValue(
    name: string,
    defaultValue?: unknown,
  ): MotionValue<unknown> | undefined {
    let mv = this.values[name];
    if (!mv && defaultValue !== undefined) {
      const newMv = motionValue(defaultValue);
      this.values[name] = newMv as MotionValue<unknown>;
      mv = newMv as MotionValue<unknown>;
    }
    return mv;
  }

  /**
   * Measure the element's bounding box in viewport coordinates.
   * Returns { x: { min, max }, y: { min, max } } format.
   */
  measureViewportBox(): Box {
    if (!this.current) {
      return {
        x: { min: 0, max: 0 },
        y: { min: 0, max: 0 },
      };
    }

    const rect = this.current.getBoundingClientRect();
    return {
      x: { min: rect.left, max: rect.right },
      y: { min: rect.top, max: rect.bottom },
    };
  }

  /**
   * Update the values reference when it changes.
   * Called when new MotionValues are added during animation setup.
   */
  setValues(values: Record<string, MotionValue<unknown>>): void {
    this.values = values;
  }

  /**
   * Update the render function reference.
   */
  setRenderFn(render: () => void): void {
    this.renderFn = render;
  }
}
