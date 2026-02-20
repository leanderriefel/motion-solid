import { expect, test } from "@playwright/test";
import {
  clearEvents,
  loadScenario,
  readEvents,
  runAction,
  waitForEventCount,
} from "../utils/harness-client";
import { byTypeAndNode } from "../utils/event-assertions";

test.describe("phase2 layout + layoutId", () => {
  test.beforeEach(async ({ page }) => {
    await loadScenario(page, "layout");
  });

  test("position parent emits layout lifecycle on width change @smoke", async ({
    page,
  }) => {
    await clearEvents(page);
    await runAction(page, "toggleExpanded");

    await waitForEventCount(page, "layoutStart", 1, "position-parent");
    await waitForEventCount(page, "layoutComplete", 1, "position-parent");
  });

  test("layout='position' child remains mounted during resize", async ({
    page,
  }) => {
    await runAction(page, "toggleExpanded");
    await page.waitForTimeout(40);

    const transform = await page
      .getByTestId("layout-position-child")
      .evaluate((el) => {
        return getComputedStyle(el).transform;
      });

    await expect(page.getByTestId("layout-position-child")).toHaveCount(1);
    expect(typeof transform).toBe("string");
  });

  test("parent layout reacts when exit child unmounts", async ({ page }) => {
    await runAction(page, "hideLayoutChild");
    await expect(page.getByTestId("layout-exit-sibling")).toHaveCount(1);
    await expect(page.getByTestId("layout-exit-parent")).toHaveCount(1);
  });

  test("shared layout toggles element between slots", async ({ page }) => {
    await expect(page.getByTestId("layout-shared-left")).toHaveCount(1);
    await expect(page.getByTestId("layout-shared-right")).toHaveCount(0);

    await runAction(page, "toggleShared");

    await expect(page.getByTestId("layout-shared-left")).toHaveCount(0);
    await expect(page.getByTestId("layout-shared-right")).toHaveCount(1);
  });

  test("shared layout emits lifecycle on both sides", async ({ page }) => {
    await clearEvents(page);
    await runAction(page, "toggleShared");

    await waitForEventCount(page, "layoutStart", 1);
    await waitForEventCount(page, "layoutComplete", 1);

    const events = await readEvents(page);
    const starts =
      byTypeAndNode(events, "layoutStart", "shared-left").length +
      byTypeAndNode(events, "layoutStart", "shared-right").length;

    expect(starts).toBeGreaterThan(0);
  });

  test("rapid shared swaps converge to exactly one shared node", async ({
    page,
  }) => {
    await runAction(page, "rapidSharedSwap", { cycles: 9, intervalMs: 20 });

    await expect
      .poll(async () => {
        const left = await page.getByTestId("layout-shared-left").count();
        const right = await page.getByTestId("layout-shared-right").count();
        return left + right;
      })
      .toBe(1);
  });

  test("rapid layout position toggles keep tree stable", async ({ page }) => {
    await runAction(page, "rapidPositionToggle", {
      cycles: 10,
      intervalMs: 22,
    });

    await expect(page.getByTestId("layout-position-parent")).toHaveCount(1);
    await expect(page.getByTestId("layout-position-child")).toHaveCount(1);
  });

  test("layout motion props are not leaked to DOM attributes", async ({
    page,
  }) => {
    const hasLayoutAttr = await page
      .getByTestId("layout-position-parent")
      .evaluate((el) => {
        return {
          layout: el.hasAttribute("layout"),
          layoutId: el.hasAttribute("layoutId"),
        };
      });

    expect(hasLayoutAttr.layout).toBe(false);
    expect(hasLayoutAttr.layoutId).toBe(false);
  });

  test("shared transition keeps slot structure intact", async ({ page }) => {
    await runAction(page, "toggleShared");
    await runAction(page, "toggleShared");

    await expect(page.getByTestId("layout-shared-left-slot")).toHaveCount(1);
    await expect(page.getByTestId("layout-shared-right-slot")).toHaveCount(1);
  });
});
