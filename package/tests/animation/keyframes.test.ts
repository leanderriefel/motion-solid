import { describe, it, expect } from "vitest";
import {
  pickInitialFromKeyframes,
  pickFinalFromKeyframes,
  areKeyframesEqual,
} from "../../src/animation/keyframes";

describe("pickInitialFromKeyframes", () => {
  describe("with array input", () => {
    it("returns first valid string/number from array", () => {
      expect(pickInitialFromKeyframes([0, 50, 100])).toBe(0);
      expect(pickInitialFromKeyframes(["0px", "50px", "100px"])).toBe("0px");
    });

    it("skips null values at the beginning", () => {
      expect(pickInitialFromKeyframes([null, 50, 100])).toBe(50);
      expect(pickInitialFromKeyframes([null, null, 100])).toBe(100);
    });

    it("returns null for empty array", () => {
      expect(pickInitialFromKeyframes([])).toBeNull();
    });

    it("returns null for array with only invalid values", () => {
      expect(pickInitialFromKeyframes([null, undefined])).toBeNull();
    });
  });

  describe("with scalar input", () => {
    it("returns the value if it is a string", () => {
      expect(pickInitialFromKeyframes("100px")).toBe("100px");
    });

    it("returns the value if it is a number", () => {
      expect(pickInitialFromKeyframes(100)).toBe(100);
      expect(pickInitialFromKeyframes(0)).toBe(0);
    });

    it("returns null for non-string/number values", () => {
      expect(pickInitialFromKeyframes(null)).toBeNull();
      expect(pickInitialFromKeyframes(undefined)).toBeNull();
      expect(pickInitialFromKeyframes({})).toBeNull();
    });
  });
});

describe("pickFinalFromKeyframes", () => {
  describe("with array input", () => {
    it("returns last valid string/number from array", () => {
      expect(pickFinalFromKeyframes([0, 50, 100])).toBe(100);
      expect(pickFinalFromKeyframes(["0px", "50px", "100px"])).toBe("100px");
    });

    it("skips null values at the end", () => {
      expect(pickFinalFromKeyframes([0, 50, null])).toBe(50);
      expect(pickFinalFromKeyframes([0, null, null])).toBe(0);
    });

    it("returns null for empty array", () => {
      expect(pickFinalFromKeyframes([])).toBeNull();
    });

    it("returns null for array with only invalid values", () => {
      expect(pickFinalFromKeyframes([null, undefined])).toBeNull();
    });
  });

  describe("with scalar input", () => {
    it("returns the value if it is a string", () => {
      expect(pickFinalFromKeyframes("100px")).toBe("100px");
    });

    it("returns the value if it is a number", () => {
      expect(pickFinalFromKeyframes(100)).toBe(100);
      expect(pickFinalFromKeyframes(0)).toBe(0);
    });

    it("returns null for non-string/number values", () => {
      expect(pickFinalFromKeyframes(null)).toBeNull();
      expect(pickFinalFromKeyframes(undefined)).toBeNull();
    });
  });
});

describe("areKeyframesEqual", () => {
  describe("array comparison", () => {
    it("returns true for equal arrays", () => {
      expect(areKeyframesEqual([0, 50, 100], [0, 50, 100])).toBe(true);
      expect(areKeyframesEqual(["a", "b"], ["a", "b"])).toBe(true);
    });

    it("returns false for arrays with different lengths", () => {
      expect(areKeyframesEqual([0, 50], [0, 50, 100])).toBe(false);
      expect(areKeyframesEqual([0, 50, 100], [0, 50])).toBe(false);
    });

    it("returns false for arrays with different values", () => {
      expect(areKeyframesEqual([0, 50, 100], [0, 50, 101])).toBe(false);
      expect(areKeyframesEqual(["a", "b"], ["a", "c"])).toBe(false);
    });

    it("returns true for empty arrays", () => {
      expect(areKeyframesEqual([], [])).toBe(true);
    });
  });

  describe("mixed array/scalar comparison", () => {
    it("returns false when one is array and other is not", () => {
      expect(areKeyframesEqual([100], 100)).toBe(false);
      expect(areKeyframesEqual(100, [100])).toBe(false);
    });
  });

  describe("scalar comparison", () => {
    it("returns true for equal scalars", () => {
      expect(areKeyframesEqual(100, 100)).toBe(true);
      expect(areKeyframesEqual("100px", "100px")).toBe(true);
      expect(areKeyframesEqual(0, 0)).toBe(true);
    });

    it("returns false for different scalars", () => {
      expect(areKeyframesEqual(100, 101)).toBe(false);
      expect(areKeyframesEqual("100px", "101px")).toBe(false);
    });

    it("returns false for different types", () => {
      expect(areKeyframesEqual(100, "100")).toBe(false);
    });
  });
});
