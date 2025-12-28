import { describe, it, expect } from "vitest";
import { stagger, isStaggerFunction } from "../../src/animation/stagger";

describe("stagger", () => {
  describe("with default 'first' origin", () => {
    it("returns 0 delay for first element", () => {
      const fn = stagger(0.1);
      expect(fn(0, 5)).toBe(0);
    });

    it("returns increasing delay based on index", () => {
      const fn = stagger(0.1);
      expect(fn(1, 5)).toBe(0.1);
      expect(fn(2, 5)).toBe(0.2);
      expect(fn(4, 5)).toBe(0.4);
    });

    it("works with different intervals", () => {
      const fn = stagger(0.25);
      expect(fn(0, 3)).toBe(0);
      expect(fn(1, 3)).toBe(0.25);
      expect(fn(2, 3)).toBe(0.5);
    });
  });

  describe("with 'last' origin", () => {
    it("returns 0 delay for last element", () => {
      const fn = stagger(0.1, { from: "last" });
      expect(fn(4, 5)).toBe(0);
    });

    it("returns max delay for first element", () => {
      const fn = stagger(0.1, { from: "last" });
      expect(fn(0, 5)).toBe(0.4);
    });

    it("returns decreasing delay toward last element", () => {
      const fn = stagger(0.1, { from: "last" });
      expect(fn(3, 5)).toBe(0.1);
      expect(fn(2, 5)).toBe(0.2);
    });
  });

  describe("with 'center' origin", () => {
    it("returns 0 delay for center element (odd count)", () => {
      const fn = stagger(0.1, { from: "center" });
      expect(fn(2, 5)).toBe(0); // center of 5 elements is index 2
    });

    it("returns equal delay for equidistant elements", () => {
      const fn = stagger(0.1, { from: "center" });
      expect(fn(1, 5)).toBe(0.1); // 1 away from center
      expect(fn(3, 5)).toBe(0.1); // 1 away from center
      expect(fn(0, 5)).toBe(0.2); // 2 away from center
      expect(fn(4, 5)).toBe(0.2); // 2 away from center
    });

    it("handles even count (fractional center)", () => {
      const fn = stagger(0.1, { from: "center" });
      // center of 4 elements is 1.5
      // index 1: |1 - 1.5| = 0.5
      // index 2: |2 - 1.5| = 0.5
      expect(fn(1, 4)).toBeCloseTo(0.05);
      expect(fn(2, 4)).toBeCloseTo(0.05);
    });
  });

  describe("with numeric origin", () => {
    it("returns 0 delay for the specified index", () => {
      const fn = stagger(0.1, { from: 2 });
      expect(fn(2, 5)).toBe(0);
    });

    it("returns delay based on distance from specified index", () => {
      const fn = stagger(0.1, { from: 2 });
      expect(fn(0, 5)).toBe(0.2); // 2 away
      expect(fn(1, 5)).toBe(0.1); // 1 away
      expect(fn(3, 5)).toBe(0.1); // 1 away
      expect(fn(4, 5)).toBe(0.2); // 2 away
    });
  });

  describe("with ease function", () => {
    it("applies easing to the delay", () => {
      // Quadratic ease: t^2
      const ease = (t: number) => t * t;
      const fn = stagger(0.4, { ease });

      // With 5 items, progress at index 4 is 4/4 = 1.0
      // eased: 1.0^2 = 1.0, delay = 0.4 * 4 * 1.0 = 1.6... wait
      // Actually: delay = ease(progress) * interval * (total - 1)
      // progress at index 4: 4 / 4 = 1.0
      // delay = 1.0 * 0.4 * 4 = 1.6
      expect(fn(4, 5)).toBe(1.6);
    });

    it("applies easing correctly for middle elements", () => {
      const ease = (t: number) => t * t;
      const fn = stagger(0.4, { ease });

      // index 2, total 5: progress = 2/4 = 0.5
      // delay = 0.25 * 0.4 * 4 = 0.4
      expect(fn(2, 5)).toBe(0.4);
    });

    it("skips ease when total is 1", () => {
      const ease = (t: number) => t * t;
      const fn = stagger(0.1, { ease });
      // With only 1 element, ease is not applied
      expect(fn(0, 1)).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles single element", () => {
      const fn = stagger(0.1);
      expect(fn(0, 1)).toBe(0);
    });

    it("handles zero interval", () => {
      const fn = stagger(0);
      expect(fn(0, 5)).toBe(0);
      expect(fn(4, 5)).toBe(0);
    });
  });
});

describe("isStaggerFunction", () => {
  it("returns true for stagger functions", () => {
    const fn = stagger(0.1);
    expect(isStaggerFunction(fn)).toBe(true);
  });

  it("returns true for stagger functions with options", () => {
    const fn = stagger(0.1, { from: "last" });
    expect(isStaggerFunction(fn)).toBe(true);
  });

  it("returns false for regular functions", () => {
    const fn = () => 0.1;
    expect(isStaggerFunction(fn)).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isStaggerFunction(0.1)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isStaggerFunction(null)).toBe(false);
    expect(isStaggerFunction(undefined)).toBe(false);
  });

  it("returns false for objects", () => {
    expect(isStaggerFunction({ __isStagger: true })).toBe(false);
  });
});
