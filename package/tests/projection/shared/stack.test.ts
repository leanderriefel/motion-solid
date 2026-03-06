import { describe, expect, it } from "vitest";
import { createBox } from "../../../src/projection/geometry/models";
import { NodeStack } from "../../../src/projection/shared/stack";

type MockNode = {
  options: { crossfade?: boolean };
  scheduleRender: () => void;
  show: () => void;
  isPresent?: boolean;
  snapshot?: unknown;
  instance?: HTMLElement;
};

const createMockNode = (): MockNode => ({
  options: {},
  scheduleRender: () => undefined,
  show: () => undefined,
  isPresent: true,
});

describe("NodeStack", () => {
  it("preserves snapshot when last member is removed", () => {
    const stack = new NodeStack();
    const node = createMockNode();

    stack.add(node);
    stack.lead = node;
    stack.prevLead = node;
    stack.snapshot = {
      animationId: 1,
      measuredBox: createBox(),
      layoutBox: createBox(),
      latestValues: {},
      source: 1,
    };

    stack.remove(node);

    expect(stack.members).toHaveLength(0);
    expect(stack.lead).toBeUndefined();
    expect(stack.prevLead).toBeUndefined();
    expect(stack.snapshot).toBeDefined();
  });

  it("preserves snapshot when stack still has members", () => {
    const stack = new NodeStack();
    const first = createMockNode();
    const second = createMockNode();

    stack.add(first);
    stack.add(second);
    stack.lead = second;
    stack.snapshot = {
      animationId: 2,
      measuredBox: createBox(),
      layoutBox: createBox(),
      latestValues: {},
      source: 2,
    };

    stack.remove(first);

    expect(stack.members).toHaveLength(1);
    expect(stack.snapshot).toBeDefined();
  });
});
