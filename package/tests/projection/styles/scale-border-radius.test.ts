import { describe, it, expect } from "vitest";
import { correctBorderRadius } from "../../../src/projection/styles/scale-border-radius";

describe("correctBorderRadius", () => {
  const createMockNode = (
    targetX: { min: number; max: number },
    targetY: { min: number; max: number },
  ) => ({
    target: {
      x: targetX,
      y: targetY,
    },
  });

  it("returns original value when node has no target", () => {
    const result = correctBorderRadius.correct(10, {
      target: undefined,
    } as never);
    expect(result).toBe(10);
  });

  it("converts pixel value to percentage", () => {
    const node = createMockNode({ min: 0, max: 100 }, { min: 0, max: 200 });
    const result = correctBorderRadius.correct(10, node as never);
    // 10px on 100 width = 10%, 10px on 200 height = 5%
    expect(result).toBe("10% 5%");
  });

  it("converts pixel string to percentage", () => {
    const node = createMockNode({ min: 0, max: 100 }, { min: 0, max: 200 });
    const result = correctBorderRadius.correct("10px", node as never);
    expect(result).toBe("10% 5%");
  });

  it("returns non-px string unchanged", () => {
    const node = createMockNode({ min: 0, max: 100 }, { min: 0, max: 100 });
    const result = correctBorderRadius.correct("50%", node as never);
    expect(result).toBe("50%");
  });

  it("preserves value when an axis has zero length", () => {
    const node = createMockNode({ min: 50, max: 50 }, { min: 0, max: 100 });
    const result = correctBorderRadius.correct(10, node as never);
    expect(result).toBe("10px");
  });

  it("handles decimal pixel values", () => {
    const node = createMockNode({ min: 0, max: 200 }, { min: 0, max: 200 });
    const result = correctBorderRadius.correct(25, node as never);
    expect(result).toBe("12.5% 12.5%");
  });
});
