import { describe, expect, it } from "vitest";
import { createProjectionNode } from "../../src/projection/projection-manager";
import { createBox, createDelta } from "../../src/projection/geometry/models";
import type { Measurements } from "../../src/projection/node/types";

describe("projection style corrections", () => {
  it("applies tree scale corrections to transform, box-shadow, and border-radius", () => {
    const node = createProjectionNode({
      element: {} as HTMLElement,
      options: { layout: true },
      latestValues: {
        "box-shadow": "10px 20px 5px black",
        "border-radius": "10px",
      },
      apply: () => undefined,
      render: () => undefined,
      scheduleRender: () => undefined,
    });

    node.layout = {
      animationId: 0,
      measuredBox: createBox(),
      layoutBox: createBox(),
      latestValues: node.latestValues,
      source: 0,
    } as Measurements;

    node.target = {
      x: { min: 0, max: 100 },
      y: { min: 0, max: 200 },
    };

    node.projectionDelta = createDelta();
    node.projectionDeltaWithTransform = createDelta();
    node.treeScale.x = 2;
    node.treeScale.y = 2;
    node.applyTransformsToTarget = () => undefined;

    const update = node.applyProjectionStyles();

    expect(update.transform).toContain("scale(0.5, 0.5)");
    expect(update.styles?.["box-shadow"]).toBe("5px 10px 2.5px black");
    expect(update.styles?.["border-top-left-radius"]).toBe("10% 5%");
    expect(update.styles?.["border-top-right-radius"]).toBe("10% 5%");
    expect(update.styles?.["border-bottom-left-radius"]).toBe("10% 5%");
    expect(update.styles?.["border-bottom-right-radius"]).toBe("10% 5%");
  });
});
