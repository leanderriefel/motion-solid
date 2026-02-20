import { describe, it, expect } from "vitest";
import { buildProjectionTransform } from "../../../src/projection/styles/transform";
import {
  createDelta,
  createPoint,
} from "../../../src/projection/geometry/models";

describe("buildProjectionTransform", () => {
  it("returns 'none' for identity transform", () => {
    const delta = createDelta();
    const treeScale = createPoint();
    expect(buildProjectionTransform(delta, treeScale)).toBe("none");
  });

  it("builds translate3d for x translation", () => {
    const delta = createDelta();
    delta.x.translate = 100;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale);
    // Note: implementation adds trailing space
    expect(result.trim()).toBe("translate3d(100px, 0px, 0px)");
  });

  it("builds translate3d for y translation", () => {
    const delta = createDelta();
    delta.y.translate = 50;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale);
    expect(result.trim()).toBe("translate3d(0px, 50px, 0px)");
  });

  it("builds translate3d for both x and y", () => {
    const delta = createDelta();
    delta.x.translate = 100;
    delta.y.translate = 50;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale);
    expect(result.trim()).toBe("translate3d(100px, 50px, 0px)");
  });

  it("includes z from latestTransform", () => {
    const delta = createDelta();
    delta.x.translate = 100;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale, { z: 25 });
    expect(result.trim()).toBe("translate3d(100px, 0px, 25px)");
  });

  it("divides translation by treeScale", () => {
    const delta = createDelta();
    delta.x.translate = 100;
    const treeScale = { x: 2, y: 1 };
    const result = buildProjectionTransform(delta, treeScale);
    // 100 / 2 = 50
    expect(result).toContain("translate3d(50px");
  });

  it("adds inverse scale when treeScale is not 1", () => {
    const delta = createDelta();
    const treeScale = { x: 2, y: 2 };
    const result = buildProjectionTransform(delta, treeScale);
    // Implementation adds inverse treeScale AND element scale
    // inverse: scale(0.5, 0.5), element: scale(1*2, 1*2) = scale(2, 2)
    expect(result).toContain("scale(0.5, 0.5)");
  });

  it("adds element scale when delta has scale", () => {
    const delta = createDelta();
    delta.x.scale = 2;
    delta.y.scale = 0.5;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale);
    expect(result).toBe("scale(2, 0.5)");
  });

  it("combines treeScale and delta scale", () => {
    const delta = createDelta();
    delta.x.scale = 2;
    delta.y.scale = 2;
    const treeScale = { x: 0.5, y: 0.5 };
    const result = buildProjectionTransform(delta, treeScale);
    // inverse treeScale: scale(2, 2)
    // element scale: delta.scale * treeScale = 2 * 0.5 = 1 (not added when 1)
    expect(result.trim()).toBe("scale(2, 2)");
  });

  it("adds rotate from latestTransform", () => {
    const delta = createDelta();
    delta.x.translate = 50;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale, { rotate: 45 });
    expect(result).toContain("rotate(45deg)");
  });

  it("adds rotateX from latestTransform", () => {
    const delta = createDelta();
    delta.x.translate = 50;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale, {
      "rotate-x": 30,
    });
    expect(result).toContain("rotateX(30deg)");
  });

  it("adds rotateY from latestTransform", () => {
    const delta = createDelta();
    delta.x.translate = 50;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale, { rotateY: 60 });
    expect(result).toContain("rotateY(60deg)");
  });

  it("adds skewX from latestTransform", () => {
    const delta = createDelta();
    delta.x.translate = 50;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale, { "skew-x": 10 });
    expect(result).toContain("skewX(10deg)");
  });

  it("adds skewY from latestTransform", () => {
    const delta = createDelta();
    delta.x.translate = 50;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale, { skewY: 15 });
    expect(result).toContain("skewY(15deg)");
  });

  it("adds perspective at the beginning", () => {
    const delta = createDelta();
    delta.x.translate = 50;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale, {
      "transform-perspective": 1000,
    });
    expect(result).toMatch(/^perspective\(1000px\)/);
  });

  it("handles transformPerspective alias", () => {
    const delta = createDelta();
    delta.x.translate = 50;
    const treeScale = createPoint();
    const result = buildProjectionTransform(delta, treeScale, {
      transformPerspective: 500,
    });
    expect(result).toMatch(/^perspective\(500px\)/);
  });

  it("does not emit non-finite values for zero treeScale", () => {
    const delta = createDelta();
    delta.x.translate = 20;
    delta.y.translate = 10;
    delta.x.scale = 0.5;
    delta.y.scale = 2;

    const result = buildProjectionTransform(delta, { x: 0, y: 0 });

    expect(result).not.toContain("Infinity");
    expect(result).not.toContain("NaN");
  });

  it("does not emit non-finite values for non-finite treeScale", () => {
    const delta = createDelta();
    delta.x.translate = 20;
    delta.y.translate = 10;

    const result = buildProjectionTransform(delta, {
      x: Number.NaN,
      y: Number.POSITIVE_INFINITY,
    });

    expect(result).not.toContain("Infinity");
    expect(result).not.toContain("NaN");
  });
});
