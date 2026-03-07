import { expect, test } from "@playwright/test";
import { loadScenario, runAction, waitForState } from "../utils/harness-client";

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

  test("layout projection applies border-radius and box-shadow scale correction", async ({
    page,
  }) => {
    await runAction(page, "setExpanded", false);
    await runAction(page, "toggleExpanded");

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const element = document.querySelector(
            '[data-testid="layout-box"]',
          ) as HTMLElement | null;
          if (!element) return null;

          return {
            transform: getComputedStyle(element).transform,
            borderTopLeftRadius: element.style.borderTopLeftRadius,
            borderRadius: element.style.borderRadius,
            boxShadow: element.style.boxShadow,
          };
        });
      })
      .toMatchObject({
        transform: expect.not.stringMatching(/^none$/),
        borderTopLeftRadius: expect.stringContaining("%"),
        boxShadow: expect.not.stringContaining("18px 40px"),
      });
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

  test("layout prop animates sibling reordering in a list", async ({
    page,
  }) => {
    await runAction(page, "setSortMetric", "impact");

    const before = await page.getByTestId("layout-reorder-sync").boundingBox();

    await runAction(page, "setSortMetric", "speed");
    await waitForState(page, "reorderIds", ["invite", "feed", "sync"]);

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const element = document.querySelector(
            '[data-testid="layout-reorder-sync"]',
          );
          return element ? getComputedStyle(element).transform : null;
        });
      })
      .not.toBe("none");

    await expect
      .poll(async () => {
        const box = await page.getByTestId("layout-reorder-sync").boundingBox();
        return box?.y ?? 0;
      })
      .toBeGreaterThan((before?.y ?? 0) + 40);
  });
});
