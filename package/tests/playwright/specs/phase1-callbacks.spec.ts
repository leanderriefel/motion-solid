import { expect, test } from "@playwright/test";
import {
  clearEvents,
  loadScenario,
  readEvents,
  runAction,
  waitForEventCount,
} from "../utils/harness-client";
import { byType } from "../utils/event-assertions";

test.describe("phase1 callbacks", () => {
  test.beforeEach(async ({ page }) => {
    await loadScenario(page, "callbacks");
  });

  test("renders callback scenario and stage @smoke", async ({ page }) => {
    await expect(page.getByTestId("scenario-callbacks")).toHaveCount(1);
    await expect(page.getByTestId("callbacks-stage")).toHaveCount(1);
    await expect(page.getByTestId("callbacks-item")).toHaveCount(1);
  });

  test("records animation completion on initial mount", async ({ page }) => {
    await waitForEventCount(page, "animationComplete", 1);

    const events = await readEvents(page);
    expect(byType(events, "animationComplete").length).toBeGreaterThan(0);
  });

  test("setOpacity updates rendered opacity", async ({ page }) => {
    await clearEvents(page);
    await runAction(page, "setOpacity", 0.45);

    await expect
      .poll(async () => {
        return page.getByTestId("callbacks-item").evaluate((el) => {
          return Number(getComputedStyle(el).opacity);
        });
      })
      .toBeCloseTo(0.45, 1);
  });

  test("hide drives callbacks item toward exit visual state", async ({
    page,
  }) => {
    await runAction(page, "hide");

    await expect
      .poll(async () => {
        return page.getByTestId("callbacks-item").evaluate((el) => {
          return Number(getComputedStyle(el).opacity);
        });
      })
      .toBeLessThan(0.3);
  });

  test("hide then show remounts callbacks item", async ({ page }) => {
    await runAction(page, "hide");
    await page.waitForTimeout(180);

    await runAction(page, "show");
    await expect(page.getByTestId("callbacks-item")).toHaveCount(1);
  });

  test("duration action keeps opacity animation functional", async ({
    page,
  }) => {
    await runAction(page, "setDuration", 0.31);
    await runAction(page, "setOpacity", 0.6);

    await expect
      .poll(async () => {
        return page.getByTestId("callbacks-item").evaluate((el) => {
          return Number(getComputedStyle(el).opacity);
        });
      })
      .toBeCloseTo(0.6, 1);
  });

  test("setZeroDuration still allows target updates", async ({ page }) => {
    await runAction(page, "setZeroDuration");
    await runAction(page, "setOpacity", 0.22);

    await expect
      .poll(async () => {
        return page.getByTestId("callbacks-item").evaluate((el) => {
          return Number(getComputedStyle(el).opacity);
        });
      })
      .toBeCloseTo(0.22, 1);
  });

  test("rapid retargeting converges to final opacity", async ({ page }) => {
    await runAction(page, "runRapidTargets", [0.2, 0.8, 0.35, 1]);

    await expect
      .poll(async () => {
        return page.getByTestId("callbacks-item").evaluate((el) => {
          return Number(getComputedStyle(el).opacity);
        });
      })
      .toBeCloseTo(1, 1);
  });

  test("replace action is accepted without breaking rendering", async ({
    page,
  }) => {
    await clearEvents(page);
    await runAction(page, "replace");

    await expect(page.getByTestId("callbacks-item")).toHaveCount(1);

    const events = await readEvents(page);
    expect(
      events.some(
        (event) => event.type === "action" && event.node === "replace",
      ),
    ).toBe(true);
  });

  test("motion props are not leaked as DOM attributes", async ({ page }) => {
    const attrs = await page.getByTestId("callbacks-item").evaluate((el) => {
      return {
        animate: el.hasAttribute("animate"),
        exit: el.hasAttribute("exit"),
        transition: el.hasAttribute("transition"),
      };
    });

    expect(attrs.animate).toBe(false);
    expect(attrs.exit).toBe(false);
    expect(attrs.transition).toBe(false);
  });
});
