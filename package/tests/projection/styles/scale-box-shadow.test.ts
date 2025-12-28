import { describe, it, expect } from "vitest";
import { correctBoxShadow } from "../../../src/projection/styles/scale-box-shadow";

describe("correctBoxShadow", () => {
  const createMockNode = (
    xScale: number,
    yScale: number,
    treeScaleX = 1,
    treeScaleY = 1,
  ) => ({
    projectionDelta: {
      x: { scale: xScale },
      y: { scale: yScale },
    },
    treeScale: {
      x: treeScaleX,
      y: treeScaleY,
    },
  });

  it("returns non-string values unchanged", () => {
    const node = createMockNode(1, 1);
    const result = correctBoxShadow.correct(10 as never, node as never);
    expect(result).toBe(10);
  });

  it("corrects simple box shadow", () => {
    const node = createMockNode(2, 2);
    // "10px 20px 5px black" - xOffset yOffset blur color
    const result = correctBoxShadow.correct(
      "10px 20px 5px black",
      node as never,
    );
    // x offset: 10 / 2 = 5, y offset: 20 / 2 = 10, blur: 5 / 2 = 2.5
    expect(result).toBe("5px 10px 2.5px black");
  });

  it("corrects box shadow with spread", () => {
    const node = createMockNode(2, 2);
    // "10px 20px 5px 2px black" - xOffset yOffset blur spread color
    const result = correctBoxShadow.correct(
      "10px 20px 5px 2px black",
      node as never,
    );
    // averageScale = 2
    // spread: 2 / 2 = 1
    expect(result).toBe("5px 10px 2.5px 1px black");
  });

  it("handles inset shadow", () => {
    const node = createMockNode(2, 2);
    const result = correctBoxShadow.correct(
      "inset 10px 20px 5px black",
      node as never,
    );
    // When "inset" is first, offset is 1
    expect(result).toBe("inset 5px 10px 2.5px black");
  });

  it("applies tree scale", () => {
    const node = createMockNode(1, 1, 2, 2);
    const result = correctBoxShadow.correct(
      "10px 20px 5px black",
      node as never,
    );
    // total xScale = 1 * 2 = 2, yScale = 1 * 2 = 2
    expect(result).toBe("5px 10px 2.5px black");
  });

  it("returns original for complex shadows with more than 5 parts", () => {
    const node = createMockNode(2, 2);
    // Too many parts
    const result = correctBoxShadow.correct(
      "10px 20px 5px 2px 1px 1px black",
      node as never,
    );
    expect(result).toBe("10px 20px 5px 2px 1px 1px black");
  });
});
