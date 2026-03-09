import { render } from "@solidjs/testing-library";
import { rootProjectionNode } from "motion-dom";
import { describe, expect, it, vi } from "vitest";
import { useInstantLayoutTransition, useResetProjection } from "../../src";

describe("layout hooks", () => {
  it("blocks and resumes the root projection tree for instant transitions", async () => {
    const originalRoot = rootProjectionNode.current;
    const blockUpdate = vi.fn();
    const unblockUpdate = vi.fn();
    const didUpdate = vi.fn();
    const resetTree = vi.fn();

    rootProjectionNode.current = {
      blockUpdate,
      unblockUpdate,
      didUpdate,
      resetTree,
    } as unknown as typeof rootProjectionNode.current;

    let runInstantTransition: ReturnType<
      typeof useInstantLayoutTransition
    > = () => undefined;

    const TestComponent = () => {
      runInstantTransition = useInstantLayoutTransition();
      return null;
    };

    render(() => <TestComponent />);

    const callback = vi.fn();
    runInstantTransition(callback);

    expect(blockUpdate).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    expect(unblockUpdate).toHaveBeenCalledTimes(1);
    expect(didUpdate).toHaveBeenCalledTimes(1);

    rootProjectionNode.current = originalRoot;
  });

  it("unblocks the root projection tree when an instant transition callback throws", async () => {
    const originalRoot = rootProjectionNode.current;
    const blockUpdate = vi.fn();
    const unblockUpdate = vi.fn();
    const didUpdate = vi.fn();
    const resetTree = vi.fn();

    rootProjectionNode.current = {
      blockUpdate,
      unblockUpdate,
      didUpdate,
      resetTree,
    } as unknown as typeof rootProjectionNode.current;

    let runInstantTransition: ReturnType<
      typeof useInstantLayoutTransition
    > = () => undefined;

    const TestComponent = () => {
      runInstantTransition = useInstantLayoutTransition();
      return null;
    };

    render(() => <TestComponent />);

    expect(() => {
      runInstantTransition(() => {
        throw new Error("boom");
      });
    }).toThrow("boom");

    expect(blockUpdate).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    expect(unblockUpdate).toHaveBeenCalledTimes(1);
    expect(didUpdate).toHaveBeenCalledTimes(1);

    rootProjectionNode.current = originalRoot;
  });

  it("resets the root projection tree", () => {
    const originalRoot = rootProjectionNode.current;
    const blockUpdate = vi.fn();
    const unblockUpdate = vi.fn();
    const didUpdate = vi.fn();
    const resetTree = vi.fn();

    rootProjectionNode.current = {
      blockUpdate,
      unblockUpdate,
      didUpdate,
      resetTree,
    } as unknown as typeof rootProjectionNode.current;

    let resetProjection: ReturnType<typeof useResetProjection> = () =>
      undefined;

    const TestComponent = () => {
      resetProjection = useResetProjection();
      return null;
    };

    render(() => <TestComponent />);

    resetProjection();

    expect(resetTree).toHaveBeenCalledTimes(1);

    rootProjectionNode.current = originalRoot;
  });
});
