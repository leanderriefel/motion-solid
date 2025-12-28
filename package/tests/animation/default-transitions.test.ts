import { describe, it, expect } from "vitest";
import { getDefaultTransition } from "../../src/animation/default-transitions";

describe("getDefaultTransition", () => {
  describe("under-damped spring properties", () => {
    const underDampedProps = [
      "x",
      "y",
      "z",
      "rotate",
      "rotate-x",
      "rotate-y",
      "rotate-z",
      "scale",
      "scale-x",
      "scale-y",
      "scale-z",
      "skew",
      "skew-x",
      "skew-y",
    ];

    for (const prop of underDampedProps) {
      it(`returns under-damped spring for '${prop}'`, () => {
        const result = getDefaultTransition(prop, { keyframes: [0, 100] });
        expect(result.type).toBe("spring");
        expect(result.stiffness).toBe(500);
        expect(result.damping).toBe(25);
        expect(result.restSpeed).toBe(10);
      });
    }
  });

  describe("critically-damped spring properties", () => {
    const criticallyDampedProps = [
      "opacity",
      "background-color",
      "color",
      "fill",
      "stroke",
    ];

    for (const prop of criticallyDampedProps) {
      it(`returns critically-damped spring for '${prop}'`, () => {
        const result = getDefaultTransition(prop, { keyframes: [0, 1] });
        expect(result.type).toBe("spring");
        expect(result.stiffness).toBe(500);
        expect(result.damping).toBe(60);
        expect(result.restSpeed).toBe(10);
      });
    }
  });

  describe("tween properties", () => {
    const tweenProps = [
      "width",
      "height",
      "padding",
      "margin",
      "border-radius",
      "font-size",
      "unknown-property",
    ];

    for (const prop of tweenProps) {
      it(`returns tween for '${prop}'`, () => {
        const result = getDefaultTransition(prop, { keyframes: [0, 100] });
        expect(result.type).toBe("tween");
        expect(result.duration).toBe(0.3);
        expect(result.ease).toBe("easeOut");
      });
    }
  });
});
