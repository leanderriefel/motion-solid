import { describe, it, expect } from "vitest";
import { mixValues } from "../../../src/projection/animation/mix-values";
import type { ResolvedValues } from "../../../src/projection/types";

describe("mixValues", () => {
  describe("opacity crossfade", () => {
    it("crossfades opacity when shouldCrossfadeOpacity is true", () => {
      const target: ResolvedValues = {};
      const follow: ResolvedValues = { opacity: 1 };
      const lead: ResolvedValues = { opacity: 1 };

      mixValues(target, follow, lead, 0.5, true, false);

      expect(target.opacity).toBeDefined();
      expect(
        (target as ResolvedValues & { opacityExit?: number }).opacityExit,
      ).toBeDefined();
    });

    it("sets lead opacity at progress 0", () => {
      const target: ResolvedValues = {};
      mixValues(target, { opacity: 1 }, { opacity: 0.8 }, 0, true, false);
      // At progress 0, lead opacity should be low (eased)
      expect(typeof target.opacity).toBe("number");
    });

    it("mixes opacity linearly when isOnlyMember and no crossfade", () => {
      const target: ResolvedValues = {};
      mixValues(target, { opacity: 0 }, { opacity: 1 }, 0.5, false, true);
      expect(target.opacity).toBe(0.5);
    });
  });

  describe("border radius mixing", () => {
    it("mixes numeric border radius", () => {
      const target: ResolvedValues = {};
      mixValues(
        target,
        { "border-top-left-radius": 0 },
        { "border-top-left-radius": 20 },
        0.5,
        false,
        false,
      );
      expect(target["border-top-left-radius"]).toBe(10);
    });

    it("mixes all border corners", () => {
      const target: ResolvedValues = {};
      const follow: ResolvedValues = {
        "border-top-left-radius": 0,
        "border-top-right-radius": 0,
        "border-bottom-left-radius": 0,
        "border-bottom-right-radius": 0,
      };
      const lead: ResolvedValues = {
        "border-top-left-radius": 20,
        "border-top-right-radius": 20,
        "border-bottom-left-radius": 20,
        "border-bottom-right-radius": 20,
      };

      mixValues(target, follow, lead, 0.5, false, false);

      expect(target["border-top-left-radius"]).toBe(10);
      expect(target["border-top-right-radius"]).toBe(10);
      expect(target["border-bottom-left-radius"]).toBe(10);
      expect(target["border-bottom-right-radius"]).toBe(10);
    });

    it("falls back to generic border-radius", () => {
      const target: ResolvedValues = {};
      mixValues(
        target,
        { "border-radius": 0 },
        { "border-top-left-radius": 20 },
        0.5,
        false,
        false,
      );
      expect(target["border-top-left-radius"]).toBe(10);
    });

    it("preserves percent suffix for percent values", () => {
      const target: ResolvedValues = {};
      mixValues(
        target,
        { "border-top-left-radius": "0%" },
        { "border-top-left-radius": "50%" },
        0.5,
        false,
        false,
      );
      expect(target["border-top-left-radius"]).toBe("25%");
    });

    it("uses lead value when units differ", () => {
      const target: ResolvedValues = {};
      mixValues(
        target,
        { "border-top-left-radius": "10px" },
        { "border-top-left-radius": "50%" },
        0.5,
        false,
        false,
      );
      // Can't mix px and %, use lead value
      expect(target["border-top-left-radius"]).toBe("50%");
    });

    it("skips undefined border radii", () => {
      const target: ResolvedValues = {};
      mixValues(target, {}, {}, 0.5, false, false);
      expect(target["border-top-left-radius"]).toBeUndefined();
    });

    it("clamps negative results to 0", () => {
      const target: ResolvedValues = {};
      // This shouldn't produce negative, but testing the Max(0, ...) logic
      mixValues(
        target,
        { "border-top-left-radius": 10 },
        { "border-top-left-radius": 0 },
        1.5, // extrapolation
        false,
        false,
      );
      expect((target["border-top-left-radius"] as number) >= 0).toBe(true);
    });
  });

  describe("rotate mixing", () => {
    it("mixes rotate values", () => {
      const target: ResolvedValues = {};
      mixValues(target, { rotate: 0 }, { rotate: 90 }, 0.5, false, false);
      expect(target.rotate).toBe(45);
    });

    it("handles missing follow rotate", () => {
      const target: ResolvedValues = {};
      mixValues(target, {}, { rotate: 90 }, 0.5, false, false);
      expect(target.rotate).toBe(45);
    });

    it("handles missing lead rotate", () => {
      const target: ResolvedValues = {};
      mixValues(target, { rotate: 90 }, {}, 0.5, false, false);
      expect(target.rotate).toBe(45);
    });

    it("skips when both rotates are undefined", () => {
      const target: ResolvedValues = {};
      mixValues(target, {}, {}, 0.5, false, false);
      expect(target.rotate).toBeUndefined();
    });
  });
});
