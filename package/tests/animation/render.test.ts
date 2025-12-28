import { describe, it, expect } from "vitest";
import {
  buildTransform,
  buildHTMLStyles,
  createRenderState,
  isTransformProp,
  toMotionDomTransformKey,
} from "../../src/animation/render";

describe("isTransformProp", () => {
  it("returns true for transform properties (kebab-case)", () => {
    expect(isTransformProp("x")).toBe(true);
    expect(isTransformProp("y")).toBe(true);
    expect(isTransformProp("z")).toBe(true);
    expect(isTransformProp("rotate")).toBe(true);
    expect(isTransformProp("rotate-x")).toBe(true);
    expect(isTransformProp("rotate-y")).toBe(true);
    expect(isTransformProp("scale")).toBe(true);
    expect(isTransformProp("scale-x")).toBe(true);
    expect(isTransformProp("scale-y")).toBe(true);
    expect(isTransformProp("skew-x")).toBe(true);
    expect(isTransformProp("skew-y")).toBe(true);
  });

  it("returns false for non-transform properties", () => {
    expect(isTransformProp("opacity")).toBe(false);
    expect(isTransformProp("color")).toBe(false);
    expect(isTransformProp("width")).toBe(false);
  });
});

describe("toMotionDomTransformKey", () => {
  it("converts kebab-case to camelCase", () => {
    expect(toMotionDomTransformKey("rotate-x")).toBe("rotateX");
    expect(toMotionDomTransformKey("scale-x")).toBe("scaleX");
    expect(toMotionDomTransformKey("skew-y")).toBe("skewY");
  });

  it("returns unchanged for already camelCase or single word", () => {
    expect(toMotionDomTransformKey("x")).toBe("x");
    expect(toMotionDomTransformKey("rotate")).toBe("rotate");
    expect(toMotionDomTransformKey("scale")).toBe("scale");
  });
});

describe("createRenderState", () => {
  it("creates empty render state", () => {
    const state = createRenderState();
    expect(state).toEqual({
      style: {},
      vars: {},
      transform: {},
      transformOrigin: {},
    });
  });

  it("creates independent instances", () => {
    const state1 = createRenderState();
    const state2 = createRenderState();
    state1.style.opacity = "1";
    expect(state2.style.opacity).toBeUndefined();
  });
});

describe("buildTransform", () => {
  it("returns 'none' for default values", () => {
    const result = buildTransform({}, {});
    expect(result).toBe("none");
  });

  it("returns 'none' when all values are default", () => {
    const result = buildTransform({ x: 0, y: 0, scale: 1 }, {});
    expect(result).toBe("none");
  });

  it("builds translateX for x", () => {
    const result = buildTransform({ x: 100 }, {});
    expect(result).toBe("translateX(100px)");
  });

  it("builds translateY for y", () => {
    const result = buildTransform({ y: 50 }, {});
    expect(result).toBe("translateY(50px)");
  });

  it("builds multiple transforms in order", () => {
    const result = buildTransform({ x: 100, y: 50 }, {});
    expect(result).toBe("translateX(100px) translateY(50px)");
  });

  it("builds scale transform", () => {
    const result = buildTransform({ scale: 2 }, {});
    expect(result).toBe("scale(2)");
  });

  it("builds rotate transform", () => {
    const result = buildTransform({ rotate: 45 }, {});
    expect(result).toBe("rotate(45deg)");
  });

  it("handles string values", () => {
    const result = buildTransform({ x: "10%" }, {});
    expect(result).toBe("translateX(10%)");
  });

  it("applies transformTemplate when provided", () => {
    const template = (
      _transform: Record<string, string | number>,
      generated: string,
    ) => `${generated} rotateZ(10deg)`;
    const result = buildTransform({ x: 100 }, {}, template);
    expect(result).toBe("translateX(100px) rotateZ(10deg)");
  });

  it("passes transform state to template", () => {
    const transformState: Record<string, string | number> = {};
    const template = (
      transform: Record<string, string | number>,
      _generated: string,
    ) => {
      return `custom: ${transform["x"]}`;
    };
    const result = buildTransform({ x: 100 }, transformState, template);
    expect(result).toBe("custom: 100px");
  });
});

describe("buildHTMLStyles", () => {
  it("sets non-transform styles", () => {
    const renderState = createRenderState();
    buildHTMLStyles(renderState, { opacity: 0.5 });
    // opacity is stored as number, not string (getValueAsType returns number for opacity)
    expect(renderState.style.opacity).toBe(0.5);
  });

  it("sets CSS variables", () => {
    const renderState = createRenderState();
    buildHTMLStyles(renderState, { "--custom-var": 100 });
    expect(renderState.vars["--custom-var"]).toBe(100);
  });

  it("builds transform for transform properties", () => {
    const renderState = createRenderState();
    buildHTMLStyles(renderState, { x: 100, y: 50 });
    expect(renderState.style.transform).toBe(
      "translateX(100px) translateY(50px)",
    );
  });

  it("sets transform to none when transform values are default", () => {
    const renderState = createRenderState();
    renderState.style.transform = "translateX(100px)"; // previous value
    buildHTMLStyles(renderState, { x: 0, opacity: 1 });
    expect(renderState.style.transform).toBe("none");
  });

  it("handles transform origin properties", () => {
    const renderState = createRenderState();
    buildHTMLStyles(renderState, { "origin-x": "0%", "origin-y": "100%" });
    expect(renderState.style["transform-origin"]).toBe("0% 100% 0");
  });

  it("sets default transform origin values", () => {
    const renderState = createRenderState();
    buildHTMLStyles(renderState, { "origin-x": "25%" });
    expect(renderState.style["transform-origin"]).toBe("25% 50% 0");
  });

  it("combines transform and non-transform styles", () => {
    const renderState = createRenderState();
    buildHTMLStyles(renderState, { x: 100, opacity: 0.5, color: "red" });
    expect(renderState.style.transform).toBe("translateX(100px)");
    expect(renderState.style.opacity).toBe(0.5);
    expect(renderState.style.color).toBe("red");
  });

  it("uses explicit transform when provided", () => {
    const renderState = createRenderState();
    buildHTMLStyles(renderState, { transform: "rotate(45deg)", x: 100 });
    // When explicit transform is provided, it's set as a style
    expect(renderState.style.transform).toBe("rotate(45deg)");
  });
});
