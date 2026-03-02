import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frame } from "motion-dom";
import type { AnimationPlaybackControlsWithThen } from "motion-dom";
import * as motionValueModule from "../../src/animation/motion-value";
import {
  createProjectionNode,
  projectionManager,
} from "../../src/projection/projection-manager";

describe("projection scheduling", () => {
  beforeEach(() => {
    (
      projectionManager as { projectionUpdateScheduled: boolean }
    ).projectionUpdateScheduled = false;
  });

  afterEach(() => {
    (
      projectionManager as { projectionUpdateScheduled: boolean }
    ).projectionUpdateScheduled = false;
    vi.restoreAllMocks();
  });

  it("runs projection updates before render in the same frame", () => {
    const order: string[] = [];
    vi.spyOn(
      projectionManager as unknown as { updateProjection: () => void },
      "updateProjection",
    ).mockImplementation(() => {
      order.push("projection");
    });

    frame.render(() => {
      order.push("render");
    });

    projectionManager.scheduleUpdateProjection();
    vi.runAllTimers();

    expect(order).toEqual(["projection", "render"]);
  });

  it("falls back to setTimeout scheduling when requestAnimationFrame is missing", () => {
    const originalRaf = (globalThis as { requestAnimationFrame?: unknown })
      .requestAnimationFrame;
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame =
      undefined;

    const calls: string[] = [];
    vi.spyOn(
      projectionManager as unknown as { updateProjection: () => void },
      "updateProjection",
    ).mockImplementation(() => {
      calls.push("projection");
    });

    projectionManager.scheduleUpdateProjection();
    expect(calls).toEqual([]);

    vi.runAllTimers();
    expect(calls).toEqual(["projection"]);

    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame =
      originalRaf;
  });

  it("flushes pending updates after layout child unmount", async () => {
    const parentElement = document.createElement("div");
    const childElement = document.createElement("div");
    parentElement.appendChild(childElement);
    document.body.appendChild(parentElement);

    const parentNode = createProjectionNode({
      element: parentElement,
      options: { layout: true },
      latestValues: {},
      apply: () => undefined,
      render: () => undefined,
      scheduleRender: () => undefined,
    });

    const childNode = createProjectionNode({
      element: childElement,
      options: { layout: true },
      latestValues: {},
      apply: () => undefined,
      render: () => undefined,
      scheduleRender: () => undefined,
    });

    projectionManager.register(parentNode);
    projectionManager.register(childNode);
    projectionManager.rebuildTree();

    const flushSpy = vi.spyOn(projectionManager, "flushUpdates");
    const checkSpy = vi.spyOn(projectionManager, "checkUpdateFailed");

    projectionManager.unregister(childNode);
    await Promise.resolve();

    expect(flushSpy).toHaveBeenCalled();
    expect(checkSpy).not.toHaveBeenCalled();

    projectionManager.unregister(parentNode);
    parentElement.remove();
  });

  it("removes element mapping when unregistering nodes", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const node = createProjectionNode({
      element,
      options: { layout: true },
      latestValues: {},
      apply: () => undefined,
      render: () => undefined,
      scheduleRender: () => undefined,
    });

    projectionManager.register(node);
    projectionManager.unregister(node);

    const managerState = projectionManager as unknown as {
      isUpdating: boolean;
    };
    managerState.isUpdating = false;

    projectionManager.scheduleUpdate(element);
    expect(managerState.isUpdating).toBe(false);

    element.remove();
  });

  it("ignores stale completion from replaced layout animations", async () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const onLayoutAnimationComplete = vi.fn();
    const node = createProjectionNode({
      element,
      options: { layout: true, onLayoutAnimationComplete },
      latestValues: {},
      apply: () => undefined,
      render: () => undefined,
      scheduleRender: () => undefined,
    });

    const createDeferred = () => {
      let resolve: (value: void | PromiseLike<void>) => void = () => undefined;
      const promise = new Promise<void>((nextResolve) => {
        resolve = nextResolve;
      });
      return { promise, resolve };
    };

    const firstAnimation = createDeferred();
    const secondAnimation = createDeferred();

    let callCount = 0;
    vi.spyOn(motionValueModule, "startMotionValueAnimation").mockImplementation(
      () => {
        callCount++;
        const finished =
          callCount === 1 ? firstAnimation.promise : secondAnimation.promise;
        return {
          stop: vi.fn(),
          finished,
        } as unknown as AnimationPlaybackControlsWithThen;
      },
    );

    node.startAnimation({ duration: 0.2 });
    await vi.advanceTimersByTimeAsync(16);
    node.startAnimation({ duration: 0.2 });
    await vi.advanceTimersByTimeAsync(16);

    firstAnimation.resolve();
    await Promise.resolve();
    expect(onLayoutAnimationComplete).not.toHaveBeenCalled();

    secondAnimation.resolve();
    await Promise.resolve();
    expect(onLayoutAnimationComplete).toHaveBeenCalledTimes(1);

    element.remove();
  });
});
