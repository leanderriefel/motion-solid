import { describe, it, expect } from "vitest";
import {
  isVariantLabels,
  isTargetAndTransition,
  mergeTargets,
  isTransition,
  resolveVariantToTarget,
} from "../../src/animation/variants";
import type { MotionOptions, MotionState, Variants } from "../../src/types";

describe("isVariantLabels", () => {
  it("returns true for string", () => {
    expect(isVariantLabels("visible")).toBe(true);
    expect(isVariantLabels("hidden")).toBe(true);
  });

  it("returns true for array of strings", () => {
    expect(isVariantLabels(["visible", "active"])).toBe(true);
    expect(isVariantLabels(["hidden"])).toBe(true);
  });

  it("returns true for empty array", () => {
    expect(isVariantLabels([])).toBe(true);
  });

  it("returns false for number", () => {
    expect(isVariantLabels(100)).toBe(false);
  });

  it("returns false for object", () => {
    expect(isVariantLabels({ opacity: 1 })).toBe(false);
  });

  it("returns false for array with non-strings", () => {
    expect(isVariantLabels(["visible", 1])).toBe(false);
    expect(isVariantLabels([1, 2, 3])).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isVariantLabels(null)).toBe(false);
    expect(isVariantLabels(undefined)).toBe(false);
  });
});

describe("isTargetAndTransition", () => {
  it("returns true for plain objects", () => {
    expect(isTargetAndTransition({ opacity: 1 })).toBe(true);
    expect(isTargetAndTransition({ x: 100, y: 200 })).toBe(true);
  });

  it("returns true for objects with transition", () => {
    expect(
      isTargetAndTransition({ opacity: 1, transition: { duration: 0.5 } }),
    ).toBe(true);
  });

  it("returns false for null", () => {
    expect(isTargetAndTransition(null)).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isTargetAndTransition("visible")).toBe(false);
    expect(isTargetAndTransition(100)).toBe(false);
    expect(isTargetAndTransition(undefined)).toBe(false);
  });

  it("returns false for legacy animation controls", () => {
    const legacyControls = {
      subscribe: () => {},
      start: () => {},
      stop: () => {},
    };
    expect(isTargetAndTransition(legacyControls)).toBe(false);
  });
});

describe("mergeTargets", () => {
  it("merges basic properties", () => {
    const a = { opacity: 0 };
    const b = { x: 100 };
    expect(mergeTargets(a, b)).toEqual({ opacity: 0, x: 100 });
  });

  it("second object properties override first", () => {
    const a = { opacity: 0, x: 50 };
    const b = { opacity: 1 };
    expect(mergeTargets(a, b)).toEqual({ opacity: 1, x: 50 });
  });

  describe("transition handling", () => {
    it("keeps a.transition if b has no transition", () => {
      const a = { opacity: 0, transition: { duration: 0.5 } };
      const b = { x: 100 };
      const result = mergeTargets(a, b);
      expect(result.transition).toEqual({ duration: 0.5 });
    });

    it("uses b.transition if b has transition", () => {
      const a = { opacity: 0, transition: { duration: 0.5 } };
      const b = { x: 100, transition: { duration: 1 } };
      const result = mergeTargets(a, b);
      expect(result.transition).toEqual({ duration: 1 });
    });

    it("uses b.transition even when a has no transition", () => {
      const a = { opacity: 0 };
      const b = { x: 100, transition: { duration: 1 } };
      const result = mergeTargets(a, b);
      expect(result.transition).toEqual({ duration: 1 });
    });
  });

  describe("transitionEnd handling", () => {
    it("merges transitionEnd from both", () => {
      const a = { opacity: 0, transitionEnd: { display: "none" } };
      const b = { x: 100, transitionEnd: { visibility: "hidden" } };
      const result = mergeTargets(a, b);
      expect(result.transitionEnd).toEqual({
        display: "none",
        visibility: "hidden",
      });
    });

    it("b.transitionEnd properties override a.transitionEnd", () => {
      const a = { transitionEnd: { display: "none" } };
      const b = { transitionEnd: { display: "block" } };
      const result = mergeTargets(a, b);
      expect(result.transitionEnd).toEqual({ display: "block" });
    });

    it("handles only a having transitionEnd", () => {
      const a = { opacity: 0, transitionEnd: { display: "none" } };
      const b = { x: 100 };
      const result = mergeTargets(a, b);
      expect(result.transitionEnd).toEqual({ display: "none" });
    });

    it("handles only b having transitionEnd", () => {
      const a = { opacity: 0 };
      const b = { x: 100, transitionEnd: { display: "block" } };
      const result = mergeTargets(a, b);
      expect(result.transitionEnd).toEqual({ display: "block" });
    });

    it("filters non-string/number values from transitionEnd", () => {
      const a = { transitionEnd: { display: "none", invalid: {} } } as never;
      const b = { transitionEnd: { opacity: 1 } };
      const result = mergeTargets(a, b);
      expect(result.transitionEnd).toEqual({ display: "none", opacity: 1 });
    });
  });
});

describe("isTransition", () => {
  it("returns true for plain objects", () => {
    expect(isTransition({ duration: 0.5 })).toBe(true);
    expect(isTransition({})).toBe(true);
  });

  it("returns false for null", () => {
    expect(isTransition(null)).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isTransition("spring")).toBe(false);
    expect(isTransition(100)).toBe(false);
    expect(isTransition(undefined)).toBe(false);
  });
});

describe("resolveVariantToTarget", () => {
  const createState = (): MotionState => ({
    element: null,
    values: {},
    goals: {},
    resolvedValues: {},
    activeGestures: {
      hover: false,
      tap: false,
      focus: false,
      drag: false,
      inView: false,
    },
    activeVariants: {},
    options: {},
    parent: null,
  });

  it("resolves function variants that return a label", () => {
    const variants: Variants = {
      hidden: { opacity: 0 },
      visible: () => "hidden",
    };

    const options: MotionOptions = {
      variants,
      custom: { direction: 1 },
    };

    const result = resolveVariantToTarget({
      variant: variants.visible!,
      options,
      state: createState(),
    });

    expect(result).toEqual({ opacity: 0 });
  });

  it("returns null when function variant returns unknown label", () => {
    const variants: Variants = {
      visible: () => "missing",
    };

    const result = resolveVariantToTarget({
      variant: variants.visible!,
      options: { variants },
      state: createState(),
    });

    expect(result).toBeNull();
  });
});
