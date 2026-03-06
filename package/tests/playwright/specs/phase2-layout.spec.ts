import { expect, test } from "@playwright/test";
import { loadScenario, runAction } from "../utils/harness-client";

test.describe("phase2 layout", () => {
  test.beforeEach(async ({ page }) => {
    await loadScenario(page, "layout");
  });

  test("layout prop animates size changes through projection transforms", async ({
    page,
  }) => {
    await runAction(page, "setExpanded", false);
    await runAction(page, "toggleExpanded");

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const element = document.querySelector('[data-testid="layout-box"]');
          return element ? getComputedStyle(element).transform : null;
        });
      })
      .not.toBe("none");

    await expect
      .poll(async () => {
        const box = await page.getByTestId("layout-box").boundingBox();
        return box?.width ?? 0;
      })
      .toBeGreaterThan(200);
  });

  test("shared layout handoff animates the lead element between tabs", async ({
    page,
  }) => {
    await runAction(page, "setSelected", "a");
    await runAction(page, "switchShared");

    await expect(page.getByTestId("layout-shared-b")).toHaveCount(1);
    await expect(page.getByTestId("layout-shared-a")).toHaveCount(0);

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const element = document.querySelector(
            '[data-testid="layout-shared-b"]',
          );
          return element ? getComputedStyle(element).transform : null;
        });
      })
      .not.toBe("none");
  });
});
