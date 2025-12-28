import { describe, it, expect } from "vitest";
import {
  hasScale,
  has2DTranslate,
  hasTransform,
} from "../../../src/projection/utils/has-transform";

describe("hasScale", () => {
  it("returns false for empty values", () => {
    expect(hasScale({})).toBe(false);
  });

  it("returns false for identity scale", () => {
    expect(hasScale({ scale: 1 })).toBe(false);
    expect(hasScale({ "scale-x": 1, "scale-y": 1 })).toBe(false);
  });

  it("returns false for string identity scale", () => {
    expect(hasScale({ scale: "1" })).toBe(false);
  });

  it("returns true for non-identity scale", () => {
    expect(hasScale({ scale: 2 })).toBe(true);
    expect(hasScale({ scale: 0.5 })).toBe(true);
    expect(hasScale({ "scale-x": 2 })).toBe(true);
    expect(hasScale({ "scale-y": 0.5 })).toBe(true);
  });

  it("handles camelCase alternatives", () => {
    expect(hasScale({ scaleX: 2 })).toBe(true);
    expect(hasScale({ scaleY: 0.5 })).toBe(true);
  });
});

describe("has2DTranslate", () => {
  it("returns false for empty values", () => {
    expect(has2DTranslate({})).toBe(false);
  });

  it("returns false for zero translation", () => {
    expect(has2DTranslate({ x: 0, y: 0 })).toBe(false);
  });

  it("returns false for zero string translation", () => {
    expect(has2DTranslate({ x: "0", y: "0%" })).toBe(false);
  });

  it("returns true for non-zero x", () => {
    expect(has2DTranslate({ x: 100 })).toBe(true);
    expect(has2DTranslate({ x: "10px" })).toBe(true);
    expect(has2DTranslate({ x: "10%" })).toBe(true);
  });

  it("returns true for non-zero y", () => {
    expect(has2DTranslate({ y: 100 })).toBe(true);
    expect(has2DTranslate({ y: "10px" })).toBe(true);
  });
});

describe("hasTransform", () => {
  it("returns false for empty values", () => {
    expect(hasTransform({})).toBe(false);
  });

  it("returns true for scale", () => {
    expect(hasTransform({ scale: 2 })).toBe(true);
  });

  it("returns true for translate", () => {
    expect(hasTransform({ x: 100 })).toBe(true);
    expect(hasTransform({ y: 50 })).toBe(true);
  });

  it("returns true for z translate", () => {
    expect(hasTransform({ z: 100 })).toBe(true);
  });

  it("returns true for rotate", () => {
    expect(hasTransform({ rotate: 45 })).toBe(true);
  });

  it("returns true for rotate-x/y", () => {
    expect(hasTransform({ "rotate-x": 45 })).toBe(true);
    expect(hasTransform({ "rotate-y": 45 })).toBe(true);
    expect(hasTransform({ rotateX: 45 })).toBe(true);
    expect(hasTransform({ rotateY: 45 })).toBe(true);
  });

  it("returns true for skew", () => {
    expect(hasTransform({ "skew-x": 10 })).toBe(true);
    expect(hasTransform({ "skew-y": 10 })).toBe(true);
    expect(hasTransform({ skewX: 10 })).toBe(true);
    expect(hasTransform({ skewY: 10 })).toBe(true);
  });

  it("returns false for non-transform properties", () => {
    expect(hasTransform({ opacity: 0.5 })).toBe(false);
    expect(hasTransform({ color: "red" })).toBe(false);
  });

  it("returns false for identity transforms", () => {
    expect(hasTransform({ scale: 1, x: 0, y: 0 })).toBe(false);
  });
});
