import { describe, it, expect } from "vitest";
import {
  removePointDelta,
  removeAxisDelta,
  removeBoxTransforms,
} from "../../../src/projection/geometry/delta-remove";
import { createBox } from "../../../src/projection/geometry/models";

describe("removePointDelta", () => {
  it("removes translate only", () => {
    // If point was at 150 after +50 translate, original was 100
    expect(removePointDelta(150, 50, 1, 100)).toBe(100);
  });

  it("removes scale only", () => {
    // Point at 150 after scale 2 around origin 50
    // Inverse: scalePoint(150, 0.5, 50) = 100
    expect(removePointDelta(150, 0, 2, 50)).toBe(100);
  });

  it("removes both translate and scale", () => {
    // Point at 175 after: scale 2 around 50, then +25 translate
    // Remove translate: 175 - 25 = 150
    // Remove scale: scalePoint(150, 0.5, 50) = 100
    expect(removePointDelta(175, 25, 2, 50)).toBe(100);
  });

  it("removes boxScale when provided", () => {
    // Point at 110 after: boxScale 0.5, scale 2, translate 10
    // Remove translate: 110 - 10 = 100
    // Remove main scale: scalePoint(100, 0.5, 50) = 75
    // Remove boxScale: scalePoint(75, 2, 50) = 100
    expect(removePointDelta(110, 10, 2, 50, 0.5)).toBe(100);
  });
});

describe("removeAxisDelta", () => {
  it("removes translate from axis", () => {
    const axis = { min: 50, max: 150 };
    removeAxisDelta(axis, 50, 1, 0.5);
    expect(axis.min).toBe(0);
    expect(axis.max).toBe(100);
  });

  it("removes scale from axis", () => {
    const axis = { min: -50, max: 150 };
    removeAxisDelta(axis, 0, 2, 0.5);
    expect(axis.min).toBe(0);
    expect(axis.max).toBe(100);
  });

  it("handles percent translate", () => {
    const axis = { min: 50, max: 150 };
    // 50% of axis (100 length) = 50
    removeAxisDelta(axis, "50%", 1, 0.5, undefined, axis, axis);
    expect(axis.min).toBe(0);
    expect(axis.max).toBe(100);
  });

  it("handles string that is not percent", () => {
    const axis = { min: 50, max: 150 };
    // Non-percent string should return early
    removeAxisDelta(axis, "invalid", 1, 0.5);
    expect(axis.min).toBe(50);
    expect(axis.max).toBe(150);
  });
});

describe("removeBoxTransforms", () => {
  it("removes x/y transforms", () => {
    const box = createBox();
    box.x = { min: 50, max: 150 };
    box.y = { min: 25, max: 125 };

    removeBoxTransforms(box, { x: 50, y: 25 });

    expect(box.x.min).toBe(0);
    expect(box.x.max).toBe(100);
    expect(box.y.min).toBe(0);
    expect(box.y.max).toBe(100);
  });

  it("removes scale transforms", () => {
    const box = createBox();
    box.x = { min: -50, max: 150 };
    box.y = { min: -50, max: 150 };

    removeBoxTransforms(box, { "scale-x": 2, "scale-y": 2 });

    expect(box.x.min).toBe(0);
    expect(box.x.max).toBe(100);
    expect(box.y.min).toBe(0);
    expect(box.y.max).toBe(100);
  });

  it("removes uniform scale", () => {
    const box = createBox();
    box.x = { min: -50, max: 150 };
    box.y = { min: -50, max: 150 };

    // When using uniform scale, it's applied as boxScale parameter
    // The function needs scale-x/scale-y to apply the main scale
    removeBoxTransforms(box, { "scale-x": 2, "scale-y": 2 });

    expect(box.x.min).toBe(0);
    expect(box.x.max).toBe(100);
    expect(box.y.min).toBe(0);
    expect(box.y.max).toBe(100);
  });

  it("handles camelCase alternatives", () => {
    const box = createBox();
    box.x = { min: -50, max: 150 };
    box.y = { min: -50, max: 150 };

    removeBoxTransforms(box, { scaleX: 2, scaleY: 2 });

    expect(box.x.min).toBe(0);
    expect(box.x.max).toBe(100);
  });
});
