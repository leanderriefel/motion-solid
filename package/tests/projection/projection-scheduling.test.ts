import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frame } from "motion-dom";
import { projectionManager } from "../../src/projection/projection-manager";

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
});
