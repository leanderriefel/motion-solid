import { expect, test } from "@playwright/test";
import {
  clearEvents,
  loadScenario,
  readEvents,
  runAction,
  waitForEventCount,
} from "../utils/harness-client";
import { byType, isInOrder } from "../utils/event-assertions";

test.describe("phase1 viewport + orchestration", () => {
  test.beforeEach(async ({ page }) => {
    await loadScenario(page, "viewport-orchestration");
  });

  test("runs delayChildren + staggerChildren in order @smoke", async ({
    page,
  }) => {
    await clearEvents(page);
    await runAction(page, "setChildCount", 3);
    await runAction(page, "startOrchestration");

    await waitForEventCount(page, "orchestrationChildStart", 3);

    const events = await readEvents(page);
    const starts = byType(events, "orchestrationChildStart");
    const nodes = starts.map((event) => event.node);

    expect(new Set(nodes.slice(0, 3))).toEqual(
      new Set(["child-0", "child-1", "child-2"]),
    );
  });

  test("records parent and child orchestration lifecycle", async ({ page }) => {
    await clearEvents(page);
    await runAction(page, "setChildCount", 2);
    await runAction(page, "startOrchestration");

    await waitForEventCount(page, "orchestrationParentComplete", 1);
    await waitForEventCount(page, "orchestrationChildComplete", 2);

    const events = await readEvents(page);
    expect(
      isInOrder(events, [{ type: "orchestrationParentStart", node: "parent" }]),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === "orchestrationChildStart" ||
          event.type === "orchestrationChildComplete",
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === "orchestrationParentComplete" &&
          event.node === "parent",
      ),
    ).toBe(true);
  });

  test("completes afterChildren parent even with zero children", async ({
    page,
  }) => {
    await clearEvents(page);
    await runAction(page, "runAfterChildrenEmpty");

    await waitForEventCount(page, "afterChildrenComplete", 1);

    const events = await readEvents(page);
    expect(byType(events, "afterChildrenComplete").length).toBeGreaterThan(0);
  });

  test("viewport once emits enter when scrolled into view", async ({
    page,
  }) => {
    await clearEvents(page);

    await page.getByTestId("viewport-target").scrollIntoViewIfNeeded();
    await waitForEventCount(page, "viewportEnter", 1);

    const events = await readEvents(page);
    expect(byType(events, "viewportEnter").length).toBe(1);
  });

  test("viewport once does not emit leave after first enter", async ({
    page,
  }) => {
    await clearEvents(page);

    await page.getByTestId("viewport-target").scrollIntoViewIfNeeded();
    await waitForEventCount(page, "viewportEnter", 1);

    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });

    await page.waitForTimeout(250);

    const events = await readEvents(page);
    expect(byType(events, "viewportLeave")).toHaveLength(0);
  });

  test("viewport enter can be observed again after remount", async ({
    page,
  }) => {
    await clearEvents(page);

    await page.getByTestId("viewport-target").scrollIntoViewIfNeeded();
    await waitForEventCount(page, "viewportEnter", 1);

    await runAction(page, "resetViewport");
    await page.getByTestId("viewport-target").scrollIntoViewIfNeeded();
    await waitForEventCount(page, "viewportEnter", 2);

    const events = await readEvents(page);
    expect(byType(events, "viewportEnter").length).toBeGreaterThanOrEqual(2);
  });
});
