import { describe, it, expect } from "vitest";
import {
  isDeltaZero,
  axisEquals,
  boxEquals,
  axisEqualsRounded,
  boxEqualsRounded,
  aspectRatio,
  axisDeltaEquals,
} from "../../../src/projection/geometry/utils";
import {
  createBox,
  createAxisDelta,
  createDelta,
} from "../../../src/projection/geometry/models";

describe("isDeltaZero", () => {
  it("returns true for identity delta", () => {
    const delta = createDelta();
    expect(isDeltaZero(delta)).toBe(true);
  });

  it("returns false when x has translate", () => {
    const delta = createDelta();
    delta.x.translate = 10;
    expect(isDeltaZero(delta)).toBe(false);
  });

  it("returns false when y has translate", () => {
    const delta = createDelta();
    delta.y.translate = 10;
    expect(isDeltaZero(delta)).toBe(false);
  });

  it("returns false when x has non-identity scale", () => {
    const delta = createDelta();
    delta.x.scale = 2;
    expect(isDeltaZero(delta)).toBe(false);
  });

  it("returns false when y has non-identity scale", () => {
    const delta = createDelta();
    delta.y.scale = 0.5;
    expect(isDeltaZero(delta)).toBe(false);
  });
});

describe("axisEquals", () => {
  it("returns true for equal axes", () => {
    expect(axisEquals({ min: 0, max: 100 }, { min: 0, max: 100 })).toBe(true);
  });

  it("returns false for different min", () => {
    expect(axisEquals({ min: 0, max: 100 }, { min: 1, max: 100 })).toBe(false);
  });

  it("returns false for different max", () => {
    expect(axisEquals({ min: 0, max: 100 }, { min: 0, max: 101 })).toBe(false);
  });
});

describe("boxEquals", () => {
  it("returns true for equal boxes", () => {
    const a = createBox();
    a.x = { min: 0, max: 100 };
    a.y = { min: 0, max: 100 };

    const b = createBox();
    b.x = { min: 0, max: 100 };
    b.y = { min: 0, max: 100 };

    expect(boxEquals(a, b)).toBe(true);
  });

  it("returns false for different x", () => {
    const a = createBox();
    a.x = { min: 0, max: 100 };
    a.y = { min: 0, max: 100 };

    const b = createBox();
    b.x = { min: 10, max: 100 };
    b.y = { min: 0, max: 100 };

    expect(boxEquals(a, b)).toBe(false);
  });

  it("returns false for different y", () => {
    const a = createBox();
    a.x = { min: 0, max: 100 };
    a.y = { min: 0, max: 100 };

    const b = createBox();
    b.x = { min: 0, max: 100 };
    b.y = { min: 0, max: 110 };

    expect(boxEquals(a, b)).toBe(false);
  });
});

describe("axisEqualsRounded", () => {
  it("returns true for equal axes", () => {
    expect(axisEqualsRounded({ min: 0, max: 100 }, { min: 0, max: 100 })).toBe(
      true,
    );
  });

  it("returns true for nearly equal axes (within rounding)", () => {
    expect(
      axisEqualsRounded({ min: 0.4, max: 100.4 }, { min: 0, max: 100 }),
    ).toBe(true);
    expect(
      axisEqualsRounded({ min: 0.6, max: 100.6 }, { min: 1, max: 101 }),
    ).toBe(true);
  });

  it("returns false for different axes after rounding", () => {
    expect(axisEqualsRounded({ min: 0, max: 100 }, { min: 2, max: 100 })).toBe(
      false,
    );
  });
});

describe("boxEqualsRounded", () => {
  it("returns true for equal boxes after rounding", () => {
    const a = createBox();
    a.x = { min: 0.4, max: 100.4 };
    a.y = { min: 0.4, max: 100.4 };

    const b = createBox();
    b.x = { min: 0, max: 100 };
    b.y = { min: 0, max: 100 };

    expect(boxEqualsRounded(a, b)).toBe(true);
  });
});

describe("aspectRatio", () => {
  it("calculates aspect ratio of box", () => {
    const box = createBox();
    box.x = { min: 0, max: 200 };
    box.y = { min: 0, max: 100 };
    expect(aspectRatio(box)).toBe(2);
  });

  it("handles square box", () => {
    const box = createBox();
    box.x = { min: 0, max: 100 };
    box.y = { min: 0, max: 100 };
    expect(aspectRatio(box)).toBe(1);
  });

  it("handles portrait orientation", () => {
    const box = createBox();
    box.x = { min: 0, max: 100 };
    box.y = { min: 0, max: 200 };
    expect(aspectRatio(box)).toBe(0.5);
  });
});

describe("axisDeltaEquals", () => {
  it("returns true for equal deltas", () => {
    const a = createAxisDelta();
    const b = createAxisDelta();
    expect(axisDeltaEquals(a, b)).toBe(true);
  });

  it("returns false for different translate", () => {
    const a = createAxisDelta();
    const b = createAxisDelta();
    b.translate = 10;
    expect(axisDeltaEquals(a, b)).toBe(false);
  });

  it("returns false for different scale", () => {
    const a = createAxisDelta();
    const b = createAxisDelta();
    b.scale = 2;
    expect(axisDeltaEquals(a, b)).toBe(false);
  });

  it("returns false for different originPoint", () => {
    const a = createAxisDelta();
    const b = createAxisDelta();
    b.originPoint = 50;
    expect(axisDeltaEquals(a, b)).toBe(false);
  });
});
