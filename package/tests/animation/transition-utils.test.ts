import { describe, it, expect } from "vitest";
import {
  isTransitionDefined,
  getTransitionForKey,
} from "../../src/animation/transition-utils";

describe("isTransitionDefined", () => {
  it("returns true when type is defined", () => {
    expect(isTransitionDefined({ type: "spring" })).toBe(true);
    expect(isTransitionDefined({ type: "tween" })).toBe(true);
    expect(isTransitionDefined({ type: false })).toBe(true);
  });

  it("returns true when ease is defined", () => {
    expect(isTransitionDefined({ ease: "easeInOut" })).toBe(true);
    expect(isTransitionDefined({ ease: [0.42, 0, 0.58, 1] })).toBe(true);
  });

  it("returns true when duration is defined", () => {
    expect(isTransitionDefined({ duration: 0.5 })).toBe(true);
    expect(isTransitionDefined({ duration: 0 })).toBe(true);
  });

  it("returns true when spring properties are defined", () => {
    expect(isTransitionDefined({ stiffness: 500 })).toBe(true);
    expect(isTransitionDefined({ damping: 25 })).toBe(true);
    expect(isTransitionDefined({ mass: 1 })).toBe(true);
    expect(isTransitionDefined({ velocity: 10 })).toBe(true);
    expect(isTransitionDefined({ bounce: 0.5 })).toBe(true);
    expect(isTransitionDefined({ restSpeed: 0.01 })).toBe(true);
    expect(isTransitionDefined({ restDelta: 0.01 })).toBe(true);
  });

  it("returns true when visualDuration is defined", () => {
    expect(isTransitionDefined({ visualDuration: 0.5 })).toBe(true);
  });

  it("returns false when no animation properties are defined", () => {
    expect(isTransitionDefined({})).toBe(false);
    expect(isTransitionDefined({ delay: 0.5 })).toBe(false);
    expect(isTransitionDefined({ repeat: 2 })).toBe(false);
  });
});

describe("getTransitionForKey", () => {
  describe("fallback behavior", () => {
    it("returns fallback when transition is undefined", () => {
      const fallback = { type: "spring" as const, stiffness: 500 };
      expect(getTransitionForKey(undefined, "x", fallback)).toBe(fallback);
    });

    it("returns undefined when no transition and no fallback", () => {
      expect(getTransitionForKey(undefined, "x")).toBeUndefined();
    });

    it("returns fallback when transition is not an object", () => {
      const fallback = { duration: 0.3 };
      expect(getTransitionForKey(null as never, "x", fallback)).toBe(fallback);
    });
  });

  describe("key-specific transitions", () => {
    it("returns key-specific transition when defined", () => {
      const transition = {
        opacity: { duration: 0.5 },
        x: { type: "spring" as const, stiffness: 500 },
      } as never;
      const result = getTransitionForKey(transition, "x");
      expect(result).toEqual({ type: "spring", stiffness: 500 });
    });

    it("prefers key-specific over default", () => {
      const transition = {
        default: { duration: 0.3 },
        x: { duration: 0.5 },
      } as never;
      const result = getTransitionForKey(transition, "x");
      expect(result).toEqual({ duration: 0.5 });
    });
  });

  describe("default transitions", () => {
    it("returns default transition when key-specific is not defined", () => {
      const transition = {
        default: { duration: 0.3 },
      } as never;
      const result = getTransitionForKey(transition, "x");
      expect(result).toEqual({ duration: 0.3 });
    });
  });

  describe("root transition", () => {
    it("returns root transition when no key-specific or default", () => {
      const transition = { duration: 0.5, ease: "easeOut" as const };
      const result = getTransitionForKey(transition, "x");
      expect(result).toEqual({ duration: 0.5, ease: "easeOut" });
    });

    it("returns fallback when root has no animation properties", () => {
      const transition = { delay: 0.2 };
      const fallback = { duration: 0.3 };
      const result = getTransitionForKey(transition, "x", fallback);
      expect(result).toEqual({ ...fallback, delay: 0.2 });
    });
  });

  describe("delay inheritance", () => {
    it("inherits delay from root to key-specific", () => {
      const transition = {
        delay: 0.2,
        x: { duration: 0.5 },
      };
      const result = getTransitionForKey(transition, "x");
      expect(result).toEqual({ duration: 0.5, delay: 0.2 });
    });

    it("does not override existing delay in key-specific", () => {
      const transition = {
        delay: 0.2,
        x: { duration: 0.5, delay: 0.5 },
      };
      const result = getTransitionForKey(transition, "x");
      expect(result).toEqual({ duration: 0.5, delay: 0.5 });
    });

    it("inherits delay from candidate if candidate has delay", () => {
      const transition = {
        delay: 0.1,
        x: { duration: 0.5, delay: 0.3 },
      };
      const result = getTransitionForKey(transition, "x");
      expect(result?.delay).toBe(0.3);
    });
  });
});
