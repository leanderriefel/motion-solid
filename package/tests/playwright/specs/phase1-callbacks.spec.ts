import { expect, test } from "@playwright/test";
import {
  clearEvents,
  loadScenario,
  readEvents,
  runAction,
  waitForEventCount,
} from "../utils/harness-client";
import { byType, byTypeAndNode } from "../utils/event-assertions";

test.describe("phase1 callbacks", () => {
  test.beforeEach(async ({ page }) => {
    await loadScenario(page, "callbacks");
  });

  test("renders callback scenario and stage @smoke", async ({ page }) => {
    await expect(page.getByTestId("scenario-callbacks")).toHaveCount(1);
    await expect(page.getByTestId("callbacks-stage")).toHaveCount(1);
    await expect(page.getByTestId("callbacks-item")).toHaveCount(1);
  });

  test("records animation completion after an opacity retarget", async ({
    page,
  }) => {
    await clearEvents(page);
    await runAction(page, "setOpacity", 0.45);
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
        const item = page.getByTestId("callbacks-item");
        if ((await item.count()) === 0) {
          return 0;
        }

        return item.evaluate((el) => {
          return Number(getComputedStyle(el).opacity);
        });
      })
      .toBeLessThan(0.6);
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

  test("rapid retargeting fires animationComplete exactly once for final target", async ({
    page,
  }) => {
    // Wait for the initial mount animation to complete first
    await waitForEventCount(page, "animationComplete", 1);
    await clearEvents(page);

    // Use a short duration so animations settle quickly
    await runAction(page, "setDuration", 0.08);

    // Fire rapid target changes — the sequence runs with 35ms intervals
    await runAction(page, "runRapidTargets", [0.2, 0.8, 0.35, 1]);

    // Wait long enough for all intermediate + final animations to settle
    await page.waitForTimeout(600);

    const events = await readEvents(page);
    const completions = byType(events, "animationComplete");

    // Only the final settled animation cycle should fire completion —
    // intermediate interrupted cycles must NOT produce callbacks
    expect(completions.length).toBe(1);
  });

  test("rapid hide/show produces one exit completion and one re-entry completion", async ({
    page,
  }) => {
    // Wait for mount completion
    await waitForEventCount(page, "animationComplete", 1);
    await clearEvents(page);

    await runAction(page, "setDuration", 0.08);

    // Rapid hide then show — the element exits and re-enters
    await runAction(page, "hide");
    await page.waitForTimeout(40);
    await runAction(page, "show");

    // Wait for the exit completion and the re-entrance completion
    await waitForEventCount(page, "animationComplete", 2);

    // Give extra time to catch any stale duplicate callbacks beyond the
    // expected exit + re-entry completions.
    await page.waitForTimeout(300);

    const events = await readEvents(page);
    const completions = byType(events, "animationComplete");

    expect(completions.length).toBe(2);
  });

  test("sequential completed cycles each fire exactly one callback", async ({
    page,
  }) => {
    // Wait for mount completion
    await waitForEventCount(page, "animationComplete", 1);
    await clearEvents(page);

    await runAction(page, "setDuration", 0.08);

    // Cycle 1: change opacity and wait for completion
    await runAction(page, "setOpacity", 0.5);
    await waitForEventCount(page, "animationComplete", 1);

    // Cycle 2: change opacity again and wait for completion
    await runAction(page, "setOpacity", 0.9);
    await waitForEventCount(page, "animationComplete", 2);

    // Give extra time to ensure no late duplicates arrive
    await page.waitForTimeout(200);

    const events = await readEvents(page);
    const completions = byType(events, "animationComplete");

    // Exactly 2 completions — one per distinct settled cycle
    expect(completions.length).toBe(2);
  });
});
