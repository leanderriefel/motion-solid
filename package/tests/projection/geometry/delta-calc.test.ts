import { describe, it, expect } from "vitest";
import {
  calcLength,
  isNear,
  calcAxisDelta,
  calcBoxDelta,
  calcRelativeAxis,
  calcRelativeBox,
  calcRelativeAxisPosition,
  calcRelativePosition,
} from "../../../src/projection/geometry/delta-calc";
import {
  createAxis,
  createBox,
  createAxisDelta,
  createDelta,
} from "../../../src/projection/geometry/models";

describe("calcLength", () => {
  it("calculates axis length", () => {
    expect(calcLength({ min: 0, max: 100 })).toBe(100);
    expect(calcLength({ min: 50, max: 150 })).toBe(100);
    expect(calcLength({ min: -50, max: 50 })).toBe(100);
  });

  it("handles zero-length axis", () => {
    expect(calcLength({ min: 50, max: 50 })).toBe(0);
  });

  it("handles negative values", () => {
    expect(calcLength({ min: -100, max: -50 })).toBe(50);
  });
});

describe("isNear", () => {
  it("returns true when value equals target", () => {
    expect(isNear(100, 100, 0)).toBe(true);
    expect(isNear(100, 100, 1)).toBe(true);
  });

  it("returns true when value is within maxDistance", () => {
    expect(isNear(100, 101, 2)).toBe(true);
    expect(isNear(100, 99, 2)).toBe(true);
    expect(isNear(100, 102, 2)).toBe(true);
  });

  it("returns false when value is outside maxDistance", () => {
    expect(isNear(100, 105, 2)).toBe(false);
    expect(isNear(100, 95, 2)).toBe(false);
  });

  it("handles negative numbers", () => {
    expect(isNear(-100, -99, 2)).toBe(true);
    expect(isNear(-100, -95, 2)).toBe(false);
  });
});

describe("calcAxisDelta", () => {
  it("calculates identity delta for same axes", () => {
    const delta = createAxisDelta();
    const axis = { min: 0, max: 100 };
    calcAxisDelta(delta, axis, axis);
    expect(delta.scale).toBe(1);
    expect(delta.translate).toBe(0);
  });

  it("calculates translate for position change", () => {
    const delta = createAxisDelta();
    calcAxisDelta(delta, { min: 0, max: 100 }, { min: 50, max: 150 });
    expect(delta.translate).toBe(50);
    expect(delta.scale).toBe(1);
  });

  it("calculates scale for size change", () => {
    const delta = createAxisDelta();
    calcAxisDelta(delta, { min: 0, max: 100 }, { min: 0, max: 200 });
    expect(delta.scale).toBe(2);
  });

  it("calculates half scale", () => {
    const delta = createAxisDelta();
    calcAxisDelta(delta, { min: 0, max: 200 }, { min: 0, max: 100 });
    expect(delta.scale).toBe(0.5);
  });

  it("handles combined translate and scale", () => {
    const delta = createAxisDelta();
    calcAxisDelta(delta, { min: 0, max: 100 }, { min: 50, max: 250 });
    expect(delta.scale).toBe(2);
    expect(delta.translate).toBe(100); // (50+250)/2 - 50 = 100
  });

  it("uses custom origin", () => {
    const delta = createAxisDelta();
    calcAxisDelta(delta, { min: 0, max: 100 }, { min: 0, max: 100 }, 0);
    expect(delta.origin).toBe(0);
    expect(delta.originPoint).toBe(0);
  });

  it("clamps near-identity scale to 1", () => {
    const delta = createAxisDelta();
    calcAxisDelta(delta, { min: 0, max: 100 }, { min: 0, max: 100.005 });
    expect(delta.scale).toBe(1);
  });

  it("clamps near-zero translate to 0", () => {
    const delta = createAxisDelta();
    calcAxisDelta(delta, { min: 0, max: 100 }, { min: 0.005, max: 100.005 });
    expect(delta.translate).toBe(0);
  });

  it("handles NaN scale (zero-length axis)", () => {
    const delta = createAxisDelta();
    calcAxisDelta(delta, { min: 50, max: 50 }, { min: 0, max: 100 });
    expect(delta.scale).toBe(1);
  });
});

describe("calcBoxDelta", () => {
  it("calculates delta for both axes", () => {
    const delta = createDelta();
    const source = createBox();
    source.x = { min: 0, max: 100 };
    source.y = { min: 0, max: 100 };

    const target = createBox();
    target.x = { min: 50, max: 150 };
    target.y = { min: 25, max: 125 };

    calcBoxDelta(delta, source, target);

    expect(delta.x.translate).toBe(50);
    expect(delta.x.scale).toBe(1);
    expect(delta.y.translate).toBe(25);
    expect(delta.y.scale).toBe(1);
  });

  it("uses origin for both axes", () => {
    const delta = createDelta();
    const source = createBox();
    source.x = { min: 0, max: 100 };
    source.y = { min: 0, max: 100 };

    const target = createBox();
    target.x = { min: 0, max: 200 };
    target.y = { min: 0, max: 200 };

    calcBoxDelta(delta, source, target, { "origin-x": 0, "origin-y": 0 });

    expect(delta.x.origin).toBe(0);
    expect(delta.y.origin).toBe(0);
  });
});

describe("calcRelativeAxis", () => {
  it("calculates target axis relative to parent", () => {
    const target = createAxis();
    const relative = { min: 10, max: 60 };
    const parent = { min: 100, max: 200 };

    calcRelativeAxis(target, relative, parent);

    expect(target.min).toBe(110); // parent.min + relative.min
    expect(target.max).toBe(160); // target.min + length(relative)
  });
});

describe("calcRelativeBox", () => {
  it("calculates target box relative to parent", () => {
    const target = createBox();
    const relative = createBox();
    relative.x = { min: 10, max: 60 };
    relative.y = { min: 20, max: 70 };

    const parent = createBox();
    parent.x = { min: 100, max: 300 };
    parent.y = { min: 200, max: 400 };

    calcRelativeBox(target, relative, parent);

    expect(target.x.min).toBe(110);
    expect(target.x.max).toBe(160);
    expect(target.y.min).toBe(220);
    expect(target.y.max).toBe(270);
  });
});

describe("calcRelativeAxisPosition", () => {
  it("calculates layout position relative to parent", () => {
    const target = createAxis();
    const layout = { min: 150, max: 250 };
    const parent = { min: 100, max: 300 };

    calcRelativeAxisPosition(target, layout, parent);

    expect(target.min).toBe(50); // layout.min - parent.min
    expect(target.max).toBe(150); // target.min + length(layout)
  });
});

describe("calcRelativePosition", () => {
  it("calculates box position relative to parent", () => {
    const target = createBox();
    const layout = createBox();
    layout.x = { min: 150, max: 250 };
    layout.y = { min: 220, max: 320 };

    const parent = createBox();
    parent.x = { min: 100, max: 300 };
    parent.y = { min: 200, max: 400 };

    calcRelativePosition(target, layout, parent);

    expect(target.x.min).toBe(50);
    expect(target.x.max).toBe(150);
    expect(target.y.min).toBe(20);
    expect(target.y.max).toBe(120);
  });
});
