import { describe, it, expect } from "vitest";
import {
  scalePoint,
  applyPointDelta,
  applyAxisDelta,
  applyBoxDelta,
  translateAxis,
  transformAxis,
  transformBox,
} from "../../../src/projection/geometry/delta-apply";
import {
  createAxis,
  createBox,
  createAxisDelta,
  createDelta,
} from "../../../src/projection/geometry/models";

describe("scalePoint", () => {
  it("returns point unchanged when scale is 1", () => {
    expect(scalePoint(100, 1, 50)).toBe(100);
  });

  it("scales point around origin", () => {
    // Point at 100, origin at 50, scale 2
    // Distance from origin: 50
    // Scaled distance: 100
    // New point: 50 + 100 = 150
    expect(scalePoint(100, 2, 50)).toBe(150);
  });

  it("scales point toward origin when scale < 1", () => {
    expect(scalePoint(100, 0.5, 50)).toBe(75);
  });

  it("handles point at origin", () => {
    expect(scalePoint(50, 2, 50)).toBe(50);
  });

  it("handles negative scale", () => {
    expect(scalePoint(100, -1, 50)).toBe(0);
  });
});

describe("applyPointDelta", () => {
  it("applies translate only", () => {
    expect(applyPointDelta(100, 50, 1, 100)).toBe(150);
  });

  it("applies scale only", () => {
    expect(applyPointDelta(100, 0, 2, 50)).toBe(150);
  });

  it("applies both translate and scale", () => {
    // Scale first: 100 -> 150 (scale 2 around origin 50)
    // Then translate: 150 + 25 = 175
    expect(applyPointDelta(100, 25, 2, 50)).toBe(175);
  });

  it("applies boxScale when provided", () => {
    // First apply boxScale: scalePoint(100, 0.5, 50) = 75
    // Then apply main scale: scalePoint(75, 2, 50) = 100
    // Then translate: 100 + 10 = 110
    expect(applyPointDelta(100, 10, 2, 50, 0.5)).toBe(110);
  });
});

describe("applyAxisDelta", () => {
  it("applies translate to axis", () => {
    const axis = { min: 0, max: 100 };
    applyAxisDelta(axis, 50, 1, 50);
    expect(axis.min).toBe(50);
    expect(axis.max).toBe(150);
  });

  it("applies scale to axis", () => {
    const axis = { min: 0, max: 100 };
    applyAxisDelta(axis, 0, 2, 50);
    expect(axis.min).toBe(-50);
    expect(axis.max).toBe(150);
  });

  it("applies both translate and scale", () => {
    const axis = { min: 0, max: 100 };
    applyAxisDelta(axis, 25, 2, 50);
    expect(axis.min).toBe(-25);
    expect(axis.max).toBe(175);
  });
});

describe("applyBoxDelta", () => {
  it("applies delta to both axes", () => {
    const box = createBox();
    box.x = { min: 0, max: 100 };
    box.y = { min: 0, max: 100 };

    const delta = createDelta();
    delta.x = { translate: 50, scale: 1, origin: 0.5, originPoint: 50 };
    delta.y = { translate: 25, scale: 1, origin: 0.5, originPoint: 50 };

    applyBoxDelta(box, delta);

    expect(box.x.min).toBe(50);
    expect(box.x.max).toBe(150);
    expect(box.y.min).toBe(25);
    expect(box.y.max).toBe(125);
  });
});

describe("translateAxis", () => {
  it("translates axis by distance", () => {
    const axis = { min: 0, max: 100 };
    translateAxis(axis, 50);
    expect(axis.min).toBe(50);
    expect(axis.max).toBe(150);
  });

  it("handles negative distance", () => {
    const axis = { min: 50, max: 150 };
    translateAxis(axis, -25);
    expect(axis.min).toBe(25);
    expect(axis.max).toBe(125);
  });
});

describe("transformAxis", () => {
  it("applies translation", () => {
    const axis = { min: 0, max: 100 };
    transformAxis(axis, 50);
    expect(axis.min).toBe(50);
    expect(axis.max).toBe(150);
  });

  it("applies scale with default origin (0.5)", () => {
    const axis = { min: 0, max: 100 };
    transformAxis(axis, undefined, 2);
    expect(axis.min).toBe(-50);
    expect(axis.max).toBe(150);
  });

  it("applies scale with custom origin", () => {
    const axis = { min: 0, max: 100 };
    transformAxis(axis, undefined, 2, undefined, 0);
    expect(axis.min).toBe(0);
    expect(axis.max).toBe(200);
  });
});

describe("transformBox", () => {
  it("transforms box with x/y values", () => {
    const box = createBox();
    box.x = { min: 0, max: 100 };
    box.y = { min: 0, max: 100 };

    transformBox(box, { x: 50, y: 25 });

    expect(box.x.min).toBe(50);
    expect(box.x.max).toBe(150);
    expect(box.y.min).toBe(25);
    expect(box.y.max).toBe(125);
  });

  it("transforms box with scale", () => {
    const box = createBox();
    box.x = { min: 0, max: 100 };
    box.y = { min: 0, max: 100 };

    transformBox(box, { "scale-x": 2, "scale-y": 0.5 });

    expect(box.x.min).toBe(-50);
    expect(box.x.max).toBe(150);
    expect(box.y.min).toBe(25);
    expect(box.y.max).toBe(75);
  });

  it("transforms box with uniform scale", () => {
    const box = createBox();
    box.x = { min: 0, max: 100 };
    box.y = { min: 0, max: 100 };

    transformBox(box, { scale: 2 });

    expect(box.x.min).toBe(-50);
    expect(box.x.max).toBe(150);
    expect(box.y.min).toBe(-50);
    expect(box.y.max).toBe(150);
  });

  it("handles camelCase alternatives", () => {
    const box = createBox();
    box.x = { min: 0, max: 100 };
    box.y = { min: 0, max: 100 };

    transformBox(box, { scaleX: 2, scaleY: 2 });

    expect(box.x.min).toBe(-50);
    expect(box.x.max).toBe(150);
  });
});
