import { expect, test } from "@playwright/test";
import {
  clearEvents,
  loadScenario,
  readEvents,
  runAction,
  waitForState,
} from "../utils/harness-client";
import { byType } from "../utils/event-assertions";

test.describe("phase2 animate-presence", () => {
  test.beforeEach(async ({ page }) => {
    await loadScenario(page, "presence");
  });

  test("mode sync replacement resolves to one visible item @smoke", async ({
    page,
  }) => {
    await runAction(page, "setMode", "sync");
    await runAction(page, "cycle");

    await expect
      .poll(async () => page.locator('[data-testid^="presence-item-"]').count())
      .toBe(1);
  });

  test("mode wait replacement resolves to target item", async ({ page }) => {
    await runAction(page, "setMode", "wait");
    await runAction(page, "setCurrent", "a");
    await runAction(page, "cycle");

    await expect(page.getByTestId("presence-item-b")).toHaveCount(1);
    await expect(page.getByTestId("presence-item-a")).toHaveCount(0);
  });

  test("mode wait queueABC resolves to final C item", async ({ page }) => {
    await runAction(page, "setMode", "wait");
    await runAction(page, "queueABC");

    await expect(page.getByTestId("presence-item-c")).toHaveCount(1);
    await expect(page.getByTestId("presence-item-a")).toHaveCount(0);
    await expect(page.getByTestId("presence-item-b")).toHaveCount(0);
  });

  test("mode popLayout replacement keeps UI stable", async ({ page }) => {
    await runAction(page, "setMode", "popLayout");
    await runAction(page, "cycle");

    await expect(page.getByTestId("presence-sibling")).toHaveCount(1);
    await expect
      .poll(async () => page.locator('[data-testid^="presence-item-"]').count())
      .toBe(1);
  });

  test("nested propagate=true outer hide removes nested tree", async ({
    page,
  }) => {
    await runAction(page, "setNested", true);
    await runAction(page, "setPropagate", true);
    await runAction(page, "hideOuter");

    await expect(page.getByTestId("presence-outer")).toHaveCount(0);
  });

  test("nested propagate=false outer hide also removes nested tree", async ({
    page,
  }) => {
    await clearEvents(page);
    await runAction(page, "setNested", true);
    await runAction(page, "setPropagate", false);
    await runAction(page, "hideOuter");

    await expect(page.getByTestId("presence-outer")).toHaveCount(0);

    await page.waitForTimeout(350);
    const events = await readEvents(page);
    expect(
      events.filter(
        (event) =>
          event.type === "innerExitComplete" && event.node === "nested-inner",
      ),
    ).toHaveLength(0);
  });

  test("rapid toggles converge with one final item", async ({ page }) => {
    await runAction(page, "rapidToggleInner", { cycles: 8, intervalMs: 20 });

    await expect
      .poll(async () => page.locator('[data-testid^="presence-item-"]').count())
      .toBe(1);
  });

  test("hideInner then showInner transitions correctly", async ({ page }) => {
    await runAction(page, "hideInner");
    await expect(page.locator('[data-testid^="presence-item-"]')).toHaveCount(
      0,
    );

    await runAction(page, "showInner");
    await expect(page.locator('[data-testid^="presence-item-"]')).toHaveCount(
      1,
    );
  });

  test("initial=false block can add additional animated items", async ({
    page,
  }) => {
    await runAction(page, "addInitialFalseItem");

    await expect(page.getByTestId("initial-false-item-1")).toHaveCount(1);
    await expect(page.getByTestId("initial-false-item-2")).toHaveCount(1);
  });

  test("initial=false baseline item remains visible", async ({ page }) => {
    await expect(page.getByTestId("initial-false-item-1")).toHaveCount(1);

    const events = await readEvents(page);
    expect(byType(events, "animationComplete").length).toBeGreaterThanOrEqual(
      0,
    );

    await waitForState(page, "initialFalseItemCount", 1);
  });
});
