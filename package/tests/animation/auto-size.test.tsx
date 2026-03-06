import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { motionValue, type MotionValue } from "motion-dom";
import { MotionElement } from "../../src/animation/motion-element";
import { startMotionValueAnimation } from "../../src/animation/motion-value";

describe("auto size resolution", () => {
  const originalScrollWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollWidth",
  );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalScrollWidth) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollWidth",
        originalScrollWidth,
      );
    } else {
      delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
    }
  });

  it("passes auto keyframes through MotionElement DOM measurement", async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        width: 137.5,
        height: 40,
        top: 0,
        left: 0,
        right: 137.5,
        bottom: 40,
        x: 0,
        y: 0,
        toJSON: () => "",
      } as DOMRect);

    const element = document.createElement("div");
    document.body.appendChild(element);

    const width = motionValue(0);
    const values: Record<string, MotionValue<unknown>> = {
      width: width as unknown as MotionValue<unknown>,
    };
    const render = () => {
      const latest = width.get();
      if (latest !== undefined) {
        element.style.width =
          typeof latest === "number" ? `${latest}px` : String(latest);
      }
    };

    const motionElement = new MotionElement(element, values, render);

    startMotionValueAnimation({
      name: "width",
      motionValue: width,
      keyframes: "auto",
      transition: { duration: 0.01 },
      element: motionElement,
    });

    await vi.advanceTimersByTimeAsync(50);

    expect(width.get()).toBe("auto");
    expect(element.style.width).toBe("auto");
    expect(rectSpy).toHaveBeenCalled();

    document.body.removeChild(element);
  });
});
