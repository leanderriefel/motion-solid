import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "@solidjs/testing-library";
import { motion } from "../../src";
import * as motionValueModule from "../../src/animation/motion-value";

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

  it("passes auto keyframes to startMotionValueAnimation with element for resolution", async () => {
    /**
     * With the DOMKeyframesResolver architecture, "auto" keyframes are now
     * resolved inside motion-dom's AsyncMotionValueAnimation, not before
     * calling startMotionValueAnimation. This test verifies that:
     * 1. "auto" keyframes are passed through to startMotionValueAnimation
     * 2. A MotionElement is provided for DOM measurement during resolution
     */
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get: () => 120,
    });

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
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

    const spy = vi
      .spyOn(motionValueModule, "startMotionValueAnimation")
      .mockImplementation(() => undefined);

    render(() => (
      <motion.div initial={{ width: 0 }} animate={{ width: "auto" }} />
    ));

    await vi.advanceTimersByTimeAsync(1);

    const widthCall = spy.mock.calls.find((call) => call[0]?.name === "width");
    // With DOMKeyframesResolver, "auto" is passed through and resolved internally
    expect(widthCall?.[0].keyframes).toBe("auto");
    // A MotionElement should be provided for DOM measurement
    expect(widthCall?.[0].element).toBeDefined();
    expect(widthCall?.[0].element?.current).toBeInstanceOf(HTMLElement);
  });
});
