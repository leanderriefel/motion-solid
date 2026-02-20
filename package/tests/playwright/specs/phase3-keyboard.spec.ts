import { expect, test } from "@playwright/test";
import {
  clearEvents,
  loadScenario,
  readEvents,
  runAction,
  waitForEventCount,
} from "../utils/harness-client";
import { byType } from "../utils/event-assertions";

test.describe("phase3 keyboard + tap", () => {
  test.beforeEach(async ({ page }) => {
    await loadScenario(page, "keyboard");
  });

  test("Enter key triggers tap lifecycle in browser @smoke", async ({
    page,
  }) => {
    await clearEvents(page);
    await runAction(page, "triggerEnterTap");

    await waitForEventCount(page, "tapStart", 1, "keyboard-target");
    await waitForEventCount(page, "tap", 1, "keyboard-target");
  });

  test("repeated Enter keydown does not multiply tapStart", async ({
    page,
  }) => {
    await clearEvents(page);
    await runAction(page, "triggerRepeatEnter");

    await waitForEventCount(page, "tapStart", 1, "keyboard-target");

    const events = await readEvents(page);
    const tapStarts = byType(events, "tapStart");

    expect(tapStarts).toHaveLength(1);
  });

  test("blur during active keyboard tap triggers cancel", async ({ page }) => {
    await clearEvents(page);
    await runAction(page, "triggerBlurCancel");

    await waitForEventCount(page, "tapCancel", 1, "keyboard-target");
  });

  test("keydown and keyup events are captured", async ({ page }) => {
    await clearEvents(page);
    await runAction(page, "focus");
    await runAction(page, "keydown", "Enter");
    await runAction(page, "keyup", "Enter");

    await waitForEventCount(page, "keyDown", 1, "Enter");
    await waitForEventCount(page, "keyUp", 1, "Enter");
  });

  test("pointer click also triggers tap callback", async ({ page }) => {
    await clearEvents(page);
    await page.getByTestId("keyboard-target").click();

    await waitForEventCount(page, "tap", 1, "keyboard-target");
  });
});
