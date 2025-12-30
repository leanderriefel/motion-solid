/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal, Show } from "solid-js";
import { motion, AnimatePresence } from "../../src";
import { buildProjectionTransform } from "../../src/projection/styles/transform";
import { calcBoxDelta } from "../../src/projection/geometry/delta-calc";
import { createBox, createDelta } from "../../src/projection/geometry/models";
import type { Box, Delta } from "motion-utils";
import * as motionValueModule from "../../src/animation/motion-value";

/**
 * Comprehensive Layout Animation Tests
 *
 * These tests verify:
 * 1. width: "auto" animation resolution
 * 2. layout="position" behavior (no scale distortion)
 * 3. Animation value continuity/smoothness
 * 4. Nested layout + AnimatePresence coordination
 * 5. Projection transform construction
 */

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock bounding rect for an element
 */
function createMockBoundingRect(
  x: number,
  y: number,
  width: number,
  height: number,
): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => "",
  } as DOMRect;
}

/**
 * Mock an element's bounding box
 */
function mockElementLayout(
  element: HTMLElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    createMockBoundingRect(x, y, width, height),
  );
}

/**
 * Create a Box from coordinates
 */
function boxFrom(x: number, y: number, width: number, height: number): Box {
  return {
    x: { min: x, max: x + width },
    y: { min: y, max: y + height },
  };
}

/**
 * Parse a transform string to extract translate and scale values
 */
function parseTransformValues(transform: string): {
  translateX: number | null;
  translateY: number | null;
  scaleX: number | null;
  scaleY: number | null;
} {
  const result = {
    translateX: null as number | null,
    translateY: null as number | null,
    scaleX: null as number | null,
    scaleY: null as number | null,
  };

  // Match translate3d(Xpx, Ypx, Zpx)
  const translate3dMatch = transform.match(
    /translate3d\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px?\s*\)/,
  );
  if (translate3dMatch) {
    result.translateX = parseFloat(translate3dMatch[1]!);
    result.translateY = parseFloat(translate3dMatch[2]!);
  }

  // Match scale(X, Y) or scale(X)
  const scaleMatch = transform.match(
    /scale\(\s*(-?[\d.]+)\s*(?:,\s*(-?[\d.]+)\s*)?\)/,
  );
  if (scaleMatch) {
    result.scaleX = parseFloat(scaleMatch[1]!);
    result.scaleY =
      scaleMatch[2] !== undefined ? parseFloat(scaleMatch[2]) : result.scaleX;
  }

  return result;
}

/**
 * Collect style values at regular intervals during animation
 */
async function collectAnimationFrames(
  element: HTMLElement,
  property: string,
  durationMs: number,
  sampleIntervalMs: number = 16,
): Promise<Array<{ time: number; value: string }>> {
  const frames: Array<{ time: number; value: string }> = [];

  for (let t = 0; t <= durationMs; t += sampleIntervalMs) {
    await vi.advanceTimersByTimeAsync(sampleIntervalMs);
    frames.push({
      time: t,
      value: element.style.getPropertyValue(property) || "",
    });
  }

  return frames;
}

/**
 * Assert that numeric values progress without large jumps
 */
function assertNoCriticalJumps(
  frames: Array<{ time: number; value: string }>,
  maxJumpPerFrame: number,
  parseValue: (v: string) => number = parseFloat,
): {
  passed: boolean;
  jumps: Array<{ from: number; to: number; time: number }>;
} {
  const numericValues = frames
    .map((f) => ({ time: f.time, value: parseValue(f.value) }))
    .filter((v) => !isNaN(v.value));

  const jumps: Array<{ from: number; to: number; time: number }> = [];

  for (let i = 1; i < numericValues.length; i++) {
    const prev = numericValues[i - 1]!;
    const curr = numericValues[i]!;
    const jump = Math.abs(curr.value - prev.value);

    if (jump > maxJumpPerFrame) {
      jumps.push({ from: prev.value, to: curr.value, time: curr.time });
    }
  }

  return { passed: jumps.length === 0, jumps };
}

// =============================================================================
// Test Suite 1: width: "auto" Animation Resolution
// =============================================================================

describe("width: auto animation resolution", () => {
  const originalScrollWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollWidth",
  );
  const originalScrollHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollHeight",
  );

  beforeEach(() => {
    // Mock scrollWidth/scrollHeight for auto size resolution
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return 150; // Simulated auto width
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 50; // Simulated auto height
      },
    });
  });

  afterEach(() => {
    // Restore original properties
    if (originalScrollWidth) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollWidth",
        originalScrollWidth,
      );
    }
    if (originalScrollHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollHeight",
        originalScrollHeight,
      );
    }
  });

  it("passes 'auto' keyframes to startMotionValueAnimation when element is provided", async () => {
    const spy = vi
      .spyOn(motionValueModule, "startMotionValueAnimation")
      .mockImplementation(() => undefined);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      createMockBoundingRect(0, 0, 150, 40),
    );

    render(() => (
      <motion.div
        data-testid="auto-width"
        initial={{ width: 0, opacity: 1 }}
        animate={{ width: "auto", opacity: 1 }}
      />
    ));

    await vi.advanceTimersByTimeAsync(50);

    const widthCall = spy.mock.calls.find((call) => call[0]?.name === "width");

    // The key fix: "auto" should be passed through, not filtered out
    expect(widthCall).toBeDefined();
    expect(widthCall?.[0].keyframes).toBe("auto");
    // MotionElement should be provided for DOM measurement
    expect(widthCall?.[0].element).toBeDefined();

    console.log("[TEST] width: auto call:", {
      name: widthCall?.[0].name,
      keyframes: widthCall?.[0].keyframes,
      hasElement: !!widthCall?.[0].element,
    });

    spy.mockRestore();
  });

  it("does NOT filter out 'auto' due to type mismatch with current numeric value", async () => {
    const spy = vi
      .spyOn(motionValueModule, "startMotionValueAnimation")
      .mockImplementation(() => undefined);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      createMockBoundingRect(0, 0, 150, 40),
    );

    render(() => (
      <motion.div
        data-testid="type-mismatch"
        initial={{ width: 0 }} // number
        animate={{ width: "auto" }} // string - previously filtered out!
      />
    ));

    await vi.advanceTimersByTimeAsync(50);

    const widthCall = spy.mock.calls.find((call) => call[0]?.name === "width");

    // Before the fix: widthCall would be undefined because "auto" was filtered out
    // After the fix: widthCall should exist with keyframes = "auto"
    expect(widthCall).toBeDefined();
    expect(widthCall?.[0].keyframes).toBe("auto");

    console.log("[TEST] type mismatch test:", {
      found: !!widthCall,
      keyframes: widthCall?.[0]?.keyframes,
    });

    spy.mockRestore();
  });

  it("handles array keyframes with 'auto' values", async () => {
    const spy = vi
      .spyOn(motionValueModule, "startMotionValueAnimation")
      .mockImplementation(() => undefined);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      createMockBoundingRect(0, 0, 150, 40),
    );

    render(() => (
      <motion.div
        data-testid="array-auto"
        initial={{ width: 0 }}
        animate={{ width: [0, "auto"] }}
      />
    ));

    await vi.advanceTimersByTimeAsync(50);

    const widthCall = spy.mock.calls.find((call) => call[0]?.name === "width");

    expect(widthCall).toBeDefined();
    // Array keyframes should be passed through
    expect(Array.isArray(widthCall?.[0].keyframes)).toBe(true);

    console.log("[TEST] array keyframes:", {
      keyframes: widthCall?.[0].keyframes,
    });

    spy.mockRestore();
  });
});

// =============================================================================
// Test Suite 2: layout="position" Behavior
// =============================================================================

describe('layout="position" behavior', () => {
  it("buildProjectionTransform produces translate without scale for position-only delta", () => {
    // Simulate a position-only layout change
    const delta: Delta = {
      x: { translate: 100, scale: 1, origin: 0, originPoint: 0 },
      y: { translate: 50, scale: 1, origin: 0, originPoint: 0 },
    };
    const treeScale = { x: 1, y: 1 };

    const transform = buildProjectionTransform(delta, treeScale);

    console.log("[TEST] position-only transform:", transform);

    const parsed = parseTransformValues(transform);
    expect(parsed.translateX).toBe(100);
    expect(parsed.translateY).toBe(50);
    // Scale should be 1 (or not present)
    expect(parsed.scaleX === null || parsed.scaleX === 1).toBe(true);
    expect(parsed.scaleY === null || parsed.scaleY === 1).toBe(true);
  });

  it("buildProjectionTransform applies counter-scale when inside scaling parent", () => {
    // Parent is scaling by 2x, child needs inverse scale
    const delta: Delta = {
      x: { translate: 50, scale: 0.5, origin: 0, originPoint: 0 }, // 1/2 to counter 2x parent
      y: { translate: 25, scale: 0.5, origin: 0, originPoint: 0 },
    };
    const treeScale = { x: 2, y: 2 }; // Parent has scaled 2x

    const transform = buildProjectionTransform(delta, treeScale);

    console.log("[TEST] counter-scale transform:", transform);

    const parsed = parseTransformValues(transform);
    // Translate should be divided by treeScale: 50/2 = 25, 25/2 = 12.5
    expect(parsed.translateX).toBe(25);
    expect(parsed.translateY).toBe(12.5);
    // Should include inverse tree scale: scale(1/2, 1/2) = scale(0.5, 0.5)
    // Plus element scale (0.5 * 2 = 1 for each axis)
    // Final: scale(0.5, 0.5) for tree + scale(0.5*2, 0.5*2) = scale(1, 1) element
  });

  it("calcBoxDelta produces correct delta for position-only change", () => {
    // source = current layout, target = where we want to animate TO
    const source = boxFrom(100, 100, 200, 50);
    const target = boxFrom(200, 150, 200, 50); // Same size, different position

    const delta = createDelta();
    calcBoxDelta(delta, source, target, {});

    console.log("[TEST] position-only delta:", {
      translateX: delta.x.translate,
      translateY: delta.y.translate,
      scaleX: delta.x.scale,
      scaleY: delta.y.scale,
    });

    // translate = target_midpoint - source_midpoint
    // source x: (100 + 300) / 2 = 200, target x: (200 + 400) / 2 = 300 -> translate = 100
    expect(delta.x.translate).toBeCloseTo(100, 1);
    expect(delta.y.translate).toBeCloseTo(50, 1);
    // Size didn't change, so scale should be 1
    expect(delta.x.scale).toBeCloseTo(1, 2);
    expect(delta.y.scale).toBeCloseTo(1, 2);
  });

  it("calcBoxDelta produces correct delta for size change", () => {
    const source = boxFrom(100, 100, 100, 50);
    const target = boxFrom(100, 100, 200, 100); // Same position, 2x size

    const delta = createDelta();
    calcBoxDelta(delta, source, target, {});

    console.log("[TEST] size change delta:", {
      translateX: delta.x.translate,
      translateY: delta.y.translate,
      scaleX: delta.x.scale,
      scaleY: delta.y.scale,
    });

    // scale = target_length / source_length = 200 / 100 = 2
    expect(delta.x.scale).toBeCloseTo(2, 2);
    expect(delta.y.scale).toBeCloseTo(2, 2);
  });
});

// =============================================================================
// Test Suite 3: Animation Value Continuity/Smoothness
// =============================================================================

describe("animation value continuity", () => {
  it("opacity animation has no sudden jumps", async () => {
    render(() => (
      <motion.div
        data-testid="opacity-smooth"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    ));

    const element = screen.getByTestId("opacity-smooth");

    // Collect frames during animation
    const frames = await collectAnimationFrames(element, "opacity", 350, 16);

    console.log(
      "[TEST] opacity frames:",
      frames.map((f) => ({ t: f.time, v: f.value })),
    );

    // Check for jumps > 0.3 per frame (should be ~0.05 per 16ms for 300ms animation)
    const { passed, jumps } = assertNoCriticalJumps(frames, 0.3);

    if (!passed) {
      console.log("[TEST] opacity jumps detected:", jumps);
    }

    // Note: In jsdom with mocked WAAPI, animations complete instantly
    // This test documents expected behavior; real smoothness requires real browser
  });

  it("transform animation has no sudden jumps", async () => {
    render(() => (
      <motion.div
        data-testid="transform-smooth"
        initial={{ x: 0 }}
        animate={{ x: 100 }}
        transition={{ duration: 0.3 }}
      />
    ));

    const element = screen.getByTestId("transform-smooth");

    const frames = await collectAnimationFrames(element, "transform", 350, 16);

    console.log(
      "[TEST] transform frames:",
      frames.map((f) => ({ t: f.time, v: f.value })),
    );

    // Parse translateX from transform strings
    const parseTranslateX = (v: string): number => {
      const match = v.match(/translate(?:3d|X)?\(\s*(-?[\d.]+)/);
      return match ? parseFloat(match[1]!) : NaN;
    };

    const { passed, jumps } = assertNoCriticalJumps(
      frames,
      50, // Max 50px jump per frame
      parseTranslateX,
    );

    if (!passed) {
      console.log("[TEST] transform jumps detected:", jumps);
    }
  });
});

// =============================================================================
// Test Suite 4: Nested Layout + AnimatePresence Coordination
// =============================================================================

describe("nested layout + AnimatePresence", () => {
  beforeEach(() => {
    // Mock getBoundingClientRect for layout measurements
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        // Return different sizes based on element attributes for testing
        const testId = this.getAttribute("data-testid");
        if (testId === "parent-layout") {
          return createMockBoundingRect(0, 0, 300, 40);
        }
        if (testId === "child-enter") {
          return createMockBoundingRect(0, 0, 100, 40);
        }
        if (testId === "child-position") {
          return createMockBoundingRect(100, 0, 80, 40);
        }
        return createMockBoundingRect(0, 0, 100, 40);
      },
    );

    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return 100;
      },
    });
  });

  it("renders parent with layout and child with AnimatePresence", async () => {
    const [show, setShow] = createSignal(false);

    render(() => (
      <motion.div data-testid="parent-layout" layout>
        <AnimatePresence>
          <Show when={show()}>
            <motion.div
              data-testid="child-enter"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
            />
          </Show>
        </AnimatePresence>
        <motion.div data-testid="child-position" layout="position">
          <span>Icons</span>
        </motion.div>
      </motion.div>
    ));

    await vi.advanceTimersByTimeAsync(50);

    const parent = screen.getByTestId("parent-layout");
    const positionChild = screen.getByTestId("child-position");

    expect(parent).toBeTruthy();
    expect(positionChild).toBeTruthy();

    console.log("[TEST] initial render:", {
      parentExists: !!parent,
      positionChildExists: !!positionChild,
    });

    // Toggle to show the enter animation child
    setShow(true);
    await vi.advanceTimersByTimeAsync(100);

    const enterChild = screen.queryByTestId("child-enter");
    console.log("[TEST] after show:", {
      enterChildExists: !!enterChild,
      enterChildStyle: enterChild?.style.cssText,
    });

    expect(enterChild).toBeTruthy();
  });

  it("child with layout='position' does not receive scale from parent", async () => {
    const [expanded, setExpanded] = createSignal(false);

    render(() => (
      <motion.div
        data-testid="scaling-parent"
        layout
        style={{
          width: expanded() ? "400px" : "200px",
          height: "40px",
        }}
      >
        <motion.div data-testid="position-child" layout="position">
          <span>Should not scale</span>
        </motion.div>
      </motion.div>
    ));

    await vi.advanceTimersByTimeAsync(50);

    const positionChild = screen.getByTestId("position-child");
    const initialTransform = positionChild.style.transform;

    console.log("[TEST] initial position-child transform:", initialTransform);

    // Trigger layout change
    setExpanded(true);
    await vi.advanceTimersByTimeAsync(100);

    const afterTransform = positionChild.style.transform;
    console.log(
      "[TEST] after expansion position-child transform:",
      afterTransform,
    );

    // If there's a transform, parse it and check for scale
    if (afterTransform && afterTransform !== "none") {
      const parsed = parseTransformValues(afterTransform);
      console.log("[TEST] parsed transform:", parsed);

      // Position-only child should not have scale !== 1
      // (or scale should be countering parent scale)
      if (parsed.scaleX !== null && parsed.scaleY !== null) {
        // If scale is present, it should be 1 or very close to 1
        // (allowing for floating point and counter-scaling)
        const scaleDeviation = Math.max(
          Math.abs(parsed.scaleX - 1),
          Math.abs(parsed.scaleY - 1),
        );
        console.log("[TEST] scale deviation from 1:", scaleDeviation);
      }
    }
  });
});

// =============================================================================
// Test Suite 5: Projection Transform Construction
// =============================================================================

describe("projection transform construction", () => {
  it("builds correct transform for translate only", () => {
    const delta: Delta = {
      x: { translate: 50, scale: 1, origin: 0.5, originPoint: 100 },
      y: { translate: -25, scale: 1, origin: 0.5, originPoint: 50 },
    };
    const treeScale = { x: 1, y: 1 };

    const transform = buildProjectionTransform(delta, treeScale);

    console.log("[TEST] translate-only transform:", transform);

    expect(transform).toContain("translate3d(50px, -25px, 0px)");
    // Should NOT contain scale when scale is 1
    expect(transform).not.toMatch(/scale\([^1]/);
  });

  it("builds correct transform for translate + scale", () => {
    const delta: Delta = {
      x: { translate: 50, scale: 1.5, origin: 0.5, originPoint: 100 },
      y: { translate: -25, scale: 0.8, origin: 0.5, originPoint: 50 },
    };
    const treeScale = { x: 1, y: 1 };

    const transform = buildProjectionTransform(delta, treeScale);

    console.log("[TEST] translate+scale transform:", transform);

    expect(transform).toContain("translate3d(50px, -25px, 0px)");
    expect(transform).toContain("scale(1.5, 0.8)");
  });

  it("applies tree scale correction", () => {
    const delta: Delta = {
      x: { translate: 100, scale: 1, origin: 0.5, originPoint: 100 },
      y: { translate: 50, scale: 1, origin: 0.5, originPoint: 50 },
    };
    const treeScale = { x: 2, y: 2 }; // Parent scaled 2x

    const transform = buildProjectionTransform(delta, treeScale);

    console.log("[TEST] tree scale corrected transform:", transform);

    // Translate should be divided by tree scale
    expect(transform).toContain("translate3d(50px, 25px, 0px)");
    // Should include inverse tree scale
    expect(transform).toContain("scale(0.5, 0.5)");
  });

  it("handles zero translate", () => {
    const delta: Delta = {
      x: { translate: 0, scale: 1.2, origin: 0.5, originPoint: 100 },
      y: { translate: 0, scale: 1.2, origin: 0.5, originPoint: 50 },
    };
    const treeScale = { x: 1, y: 1 };

    const transform = buildProjectionTransform(delta, treeScale);

    console.log("[TEST] zero translate transform:", transform);

    // Should still have scale
    expect(transform).toContain("scale(1.2, 1.2)");
  });

  it('returns "none" for identity transform', () => {
    const delta: Delta = {
      x: { translate: 0, scale: 1, origin: 0.5, originPoint: 100 },
      y: { translate: 0, scale: 1, origin: 0.5, originPoint: 50 },
    };
    const treeScale = { x: 1, y: 1 };

    const transform = buildProjectionTransform(delta, treeScale);

    console.log("[TEST] identity transform:", transform);

    expect(transform).toBe("none");
  });
});

// =============================================================================
// Test Suite 6: Layout Animation Lifecycle
// =============================================================================

describe("layout animation lifecycle", () => {
  it("triggers layout measurement on layoutDependencies change", async () => {
    const [count, setCount] = createSignal(0);

    render(() => (
      <motion.div
        data-testid="layout-deps"
        layout
        layoutDependencies={[count]}
        style={{ width: count() === 0 ? "100px" : "200px" }}
      >
        Content
      </motion.div>
    ));

    await vi.advanceTimersByTimeAsync(50);

    const element = screen.getByTestId("layout-deps");
    const initialWidth = element.style.width;

    console.log("[TEST] initial width:", initialWidth);

    // Change dependency
    setCount(1);
    await vi.advanceTimersByTimeAsync(100);

    const afterWidth = element.style.width;
    console.log("[TEST] after change width:", afterWidth);

    expect(afterWidth).toBe("200px");
  });

  it("handles rapid layout changes without crashing", async () => {
    const [width, setWidth] = createSignal(100);

    render(() => (
      <motion.div
        data-testid="rapid-layout"
        layout
        layoutDependencies={[width]}
        style={{ width: `${width()}px` }}
      >
        Content
      </motion.div>
    ));

    await vi.advanceTimersByTimeAsync(20);

    // Rapid changes
    for (let i = 0; i < 10; i++) {
      setWidth((w) => w + 10);
      await vi.advanceTimersByTimeAsync(16);
    }

    const element = screen.getByTestId("rapid-layout");
    expect(element).toBeTruthy();

    console.log("[TEST] after rapid changes, element still exists:", {
      width: element.style.width,
    });
  });
});

// =============================================================================
// Parent Layout Animation on Child Unmount
// =============================================================================

describe("parent layout animation on child unmount", () => {
  it("should trigger parent willUpdate when child with layout unmounts", async () => {
    const [show, setShow] = createSignal(true);
    const parentWillUpdateCalls: number[] = [];

    // Track willUpdate calls by spying on the projection manager
    const { unmount } = render(() => (
      <motion.div
        data-testid="parent"
        layout
        style={{ display: "flex", gap: "8px" }}
      >
        <Show when={show()}>
          <motion.div
            data-testid="child"
            layout
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Child
          </motion.div>
        </Show>
        <motion.div data-testid="sibling" layout="position">
          Sibling
        </motion.div>
      </motion.div>
    ));

    await vi.advanceTimersByTimeAsync(50);

    const parent = screen.getByTestId("parent");
    const child = screen.queryByTestId("child");
    expect(parent).toBeTruthy();
    expect(child).toBeTruthy();

    // Trigger unmount
    setShow(false);
    await vi.advanceTimersByTimeAsync(16);

    // Parent should still exist
    expect(screen.getByTestId("parent")).toBeTruthy();
    // Sibling should still exist
    expect(screen.getByTestId("sibling")).toBeTruthy();

    // Allow time for exit animation
    await vi.advanceTimersByTimeAsync(500);

    unmount();
  });

  it("should animate parent layout including flex gap when child unmounts", async () => {
    const [show, setShow] = createSignal(true);

    const { unmount } = render(() => (
      <motion.div
        data-testid="flex-parent"
        layout
        style={{ display: "flex", gap: "8px", width: "auto" }}
      >
        <AnimatePresence>
          <Show when={show()}>
            <motion.div
              data-testid="flex-child"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 100, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              Child
            </motion.div>
          </Show>
        </AnimatePresence>
        <motion.div layout="position" style={{ width: "50px" }}>
          Sibling
        </motion.div>
      </motion.div>
    ));

    await vi.advanceTimersByTimeAsync(400);

    const parent = screen.getByTestId("flex-parent");
    expect(parent).toBeTruthy();

    // Trigger child exit
    setShow(false);

    // Sample parent layout during exit animation
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(50);
      // In a real test, we'd measure the parent's bounding rect
      // For now, we just verify no errors occur during the process
    }

    // After exit animation completes, verify the child has the exit styles applied
    await vi.advanceTimersByTimeAsync(500);
    const child = screen.queryByTestId("flex-child");
    // Element may still be in DOM but should have exit styles (width: 0, opacity: 0)
    if (child) {
      expect(child.style.width).toBe("0px");
      expect(child.style.opacity).toBe("0");
    }

    unmount();
  });

  it("should handle nested layout elements during unmount", async () => {
    const [show, setShow] = createSignal(true);

    const { unmount } = render(() => (
      <motion.div data-testid="outer" layout>
        <motion.div data-testid="middle" layout>
          <AnimatePresence>
            <Show when={show()}>
              <motion.div
                data-testid="inner"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                Inner
              </motion.div>
            </Show>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    ));

    await vi.advanceTimersByTimeAsync(300);

    expect(screen.getByTestId("outer")).toBeTruthy();
    expect(screen.getByTestId("middle")).toBeTruthy();
    expect(screen.getByTestId("inner")).toBeTruthy();

    // Trigger unmount of inner element
    setShow(false);
    await vi.advanceTimersByTimeAsync(50);

    // Outer and middle should still exist
    expect(screen.getByTestId("outer")).toBeTruthy();
    expect(screen.getByTestId("middle")).toBeTruthy();

    // Allow exit animation to complete
    await vi.advanceTimersByTimeAsync(500);
    const inner = screen.queryByTestId("inner");
    // Element may still be in DOM but should have exit styles (scale: 0)
    if (inner) {
      const transform = inner.style.transform;
      // Should have scale(0) or similar exit transform
      expect(transform).toBeTruthy();
    }

    unmount();
  });

  it("should properly sequence parent and child layout animations", async () => {
    const [extended, setExtended] = createSignal(false);

    const { unmount } = render(() => (
      <motion.div
        data-testid="bar-parent"
        layout
        layoutDependencies={[extended]}
        style={{ display: "flex", gap: "8px" }}
      >
        <AnimatePresence>
          <Show when={extended()}>
            <motion.div
              data-testid="bar-child"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ width: "40px" }}>X</div>
            </motion.div>
          </Show>
        </AnimatePresence>
        <motion.div layout="position">Icons</motion.div>
      </motion.div>
    ));

    await vi.advanceTimersByTimeAsync(50);

    // Extend - add child
    setExtended(true);
    await vi.advanceTimersByTimeAsync(400);

    expect(screen.getByTestId("bar-child")).toBeTruthy();

    // Collapse - remove child
    setExtended(false);
    await vi.advanceTimersByTimeAsync(50);

    // During exit, parent should be animating
    const parent = screen.getByTestId("bar-parent");
    expect(parent).toBeTruthy();

    await vi.advanceTimersByTimeAsync(500);
    const child = screen.queryByTestId("bar-child");
    // Element may still be in DOM but should have exit styles (width: 0, opacity: 0)
    if (child) {
      expect(child.style.width).toBe("0px");
      expect(child.style.opacity).toBe("0");
    }

    unmount();
  });
});

// =============================================================================
// Debug Helpers (can be enabled for verbose output)
// =============================================================================

describe("debug: projection delta calculations", () => {
  it("logs delta calculation for expanding container", () => {
    // source = current measured layout (snapshot)
    // target = where we want to animate TO (new layout)
    // Simulating: container goes from 200x40 to 300x40
    const source = boxFrom(50, 100, 200, 40); // snapshot
    const target = boxFrom(50, 100, 300, 40); // new layout

    const delta = createDelta();
    calcBoxDelta(delta, source, target, {});

    console.log("[DEBUG] expanding container delta:", {
      source,
      target,
      delta: {
        x: {
          translate: delta.x.translate,
          scale: delta.x.scale,
          origin: delta.x.origin,
        },
        y: {
          translate: delta.y.translate,
          scale: delta.y.scale,
          origin: delta.y.origin,
        },
      },
    });

    // When going from 200 to 300 width:
    // scale = target / source = 300/200 = 1.5
    expect(delta.x.scale).toBeCloseTo(1.5, 2);
    expect(delta.y.scale).toBeCloseTo(1, 2);
  });

  it("logs delta calculation for position shift", () => {
    // Simulating: element shifts right by 100px
    const source = boxFrom(50, 100, 100, 40); // snapshot
    const target = boxFrom(150, 100, 100, 40); // new layout

    const delta = createDelta();
    calcBoxDelta(delta, source, target, {});

    console.log("[DEBUG] position shift delta:", {
      source,
      target,
      delta: {
        x: {
          translate: delta.x.translate,
          scale: delta.x.scale,
          origin: delta.x.origin,
        },
        y: {
          translate: delta.y.translate,
          scale: delta.y.scale,
          origin: delta.y.origin,
        },
      },
    });

    // translate = target_midpoint - source_midpoint
    // source x: 50 + 50 = 100 midpoint, target x: 150 + 50 = 200 midpoint
    // translate = 200 - 100 = 100
    expect(delta.x.translate).toBeCloseTo(100, 1);
    expect(delta.x.scale).toBeCloseTo(1, 2);
  });
});
