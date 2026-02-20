import { expect, test } from "@playwright/test";
import {
  clearEvents,
  loadScenario,
  readState,
  runAction,
  waitForEventCount,
} from "../utils/harness-client";

test.describe("phase3 reduced motion", () => {
  test.beforeEach(async ({ page }) => {
    await loadScenario(page, "reduced-motion");
  });

  test("mode never runs enter lifecycle @smoke", async ({ page }) => {
    await clearEvents(page);
    await runAction(page, "setReducedMotion", "never");
    await runAction(page, "toggle");
    await runAction(page, "toggle");

    await waitForEventCount(page, "animationStart", 1, "reduced-motion-item");
    await waitForEventCount(
      page,
      "animationComplete",
      1,
      "reduced-motion-item",
    );
  });

  test("mode always still runs lifecycle callbacks", async ({ page }) => {
    await clearEvents(page);
    await runAction(page, "setReducedMotion", "always");
    await runAction(page, "toggle");
    await runAction(page, "toggle");

    await waitForEventCount(page, "animationStart", 1, "reduced-motion-item");
    await waitForEventCount(
      page,
      "animationComplete",
      1,
      "reduced-motion-item",
    );
  });

  test("hide removes element under reduced motion", async ({ page }) => {
    await runAction(page, "setReducedMotion", "always");
    await runAction(page, "hide");

    await expect(page.getByTestId("reduced-motion-item")).toHaveCount(0);
  });

  test("mode can be switched at runtime", async ({ page }) => {
    await runAction(page, "setReducedMotion", "never");
    await expect
      .poll(async () => {
        const state = await readState(page);
        return state.mode;
      })
      .toBe("never");

    await runAction(page, "setReducedMotion", "always");
    await expect
      .poll(async () => {
        const state = await readState(page);
        return state.mode;
      })
      .toBe("always");
  });

  test("mode user works with reduced-motion media preference @reduced-motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await clearEvents(page);

    await runAction(page, "setReducedMotion", "user");
    await runAction(page, "toggle");
    await runAction(page, "toggle");

    await waitForEventCount(
      page,
      "animationComplete",
      1,
      "reduced-motion-item",
    );
  });

  test("duration value updates in scenario state", async ({ page }) => {
    await runAction(page, "setDuration", 0.44);

    await expect
      .poll(async () => {
        const state = await readState(page);
        return Number(state.duration ?? 0);
      })
      .toBeCloseTo(0.44, 2);
  });
});
