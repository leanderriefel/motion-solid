import { expect, test } from "@playwright/test";
import {
  clearEvents,
  loadScenario,
  readEvents,
  runAction,
} from "../utils/harness-client";
import { byType } from "../utils/event-assertions";

test.describe("phase2 race conditions", () => {
  test("callbacks rapid hide/show converges to single mounted element", async ({
    page,
  }) => {
    await loadScenario(page, "callbacks");
    await clearEvents(page);

    await runAction(page, "hide");
    await page.waitForTimeout(40);
    await runAction(page, "show");

    await expect(page.getByTestId("callbacks-item")).toHaveCount(1);

    const count = await page.locator('[data-testid="callbacks-item"]').count();
    expect(count).toBe(1);
  });

  test("callbacks rapid targets followed by hide still complete exit", async ({
    page,
  }) => {
    await loadScenario(page, "callbacks");
    await clearEvents(page);

    await runAction(page, "runRapidTargets", [0.1, 0.8, 0.2, 1]);
    await runAction(page, "hide");

    await expect
      .poll(async () => {
        return page.getByTestId("callbacks-item").evaluate((el) => {
          return Number(getComputedStyle(el).opacity);
        });
      })
      .toBeLessThan(0.3);
  });

  test("presence rapid inner toggles resolve to stable final state", async ({
    page,
  }) => {
    await loadScenario(page, "presence");
    await clearEvents(page);

    await runAction(page, "rapidToggleInner", { cycles: 9, intervalMs: 20 });

    await expect
      .poll(async () => {
        return page.locator('[data-testid^="presence-item-"]').count();
      })
      .toBe(1);
  });

  test("presence outer hide/show recovers without duplicate items", async ({
    page,
  }) => {
    await loadScenario(page, "presence");
    await clearEvents(page);

    await runAction(page, "hideOuter");
    await page.waitForTimeout(60);
    await runAction(page, "showOuter");

    await expect(page.getByTestId("presence-outer")).toHaveCount(1);

    const itemCount = await page
      .locator('[data-testid^="presence-item-"]')
      .count();
    expect(itemCount).toBe(1);
  });

  test("layout rapid mixed actions keep shared element singular", async ({
    page,
  }) => {
    await loadScenario(page, "layout");

    await runAction(page, "rapidSharedSwap", { cycles: 5, intervalMs: 16 });
    await runAction(page, "rapidPositionToggle", { cycles: 6, intervalMs: 18 });

    await expect
      .poll(async () => {
        const left = await page.getByTestId("layout-shared-left").count();
        const right = await page.getByTestId("layout-shared-right").count();
        return left + right;
      })
      .toBe(1);
  });

  test("presence does not emit exit completion without an exit", async ({
    page,
  }) => {
    await loadScenario(page, "presence");
    await clearEvents(page);

    await runAction(page, "setMode", "sync");
    await runAction(page, "setCurrent", "a");
    await page.waitForTimeout(80);

    const events = await readEvents(page);
    expect(byType(events, "exitComplete")).toHaveLength(0);
  });
});
