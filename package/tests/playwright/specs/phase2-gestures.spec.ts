import { expect, test, type Page } from "@playwright/test";
import { loadScenario, runAction } from "../utils/harness-client";

const dragBoxBy = async (page: Page, deltaX: number, deltaY: number) => {
  const target = page.getByTestId("gesture-drag-box");
  const before = await target.boundingBox();

  if (!before) {
    throw new Error("gesture-drag-box bounding box not found");
  }

  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width / 2 + deltaX,
    before.y + before.height / 2 + deltaY,
    { steps: 12 },
  );
  await page.mouse.up();

  return before;
};

test.describe("phase2 gestures", () => {
  test.beforeEach(async ({ page }) => {
    await loadScenario(page, "gestures");
  });

  test("drag updates position in free mode", async ({ page }) => {
    const before = await dragBoxBy(page, 96, 64);

    await expect
      .poll(async () => {
        const after = await page.getByTestId("gesture-drag-box").boundingBox();
        return {
          x: after?.x ?? 0,
          y: after?.y ?? 0,
        };
      })
      .toMatchObject({
        x: expect.any(Number),
        y: expect.any(Number),
      });

    const after = await page.getByTestId("gesture-drag-box").boundingBox();
    expect(after?.x ?? 0).toBeGreaterThan((before?.x ?? 0) + 40);
    expect(after?.y ?? 0).toBeGreaterThan((before?.y ?? 0) + 20);
  });

  test("x-axis drag lock prevents meaningful y movement", async ({ page }) => {
    await runAction(page, "setDragMode", "x");

    const before = await dragBoxBy(page, 96, 72);
    const after = await page.getByTestId("gesture-drag-box").boundingBox();

    expect(after?.x ?? 0).toBeGreaterThan((before?.x ?? 0) + 40);
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(8);
  });

  test("locked mode does not start drag movement", async ({ page }) => {
    await runAction(page, "setDragMode", "locked");

    const before = await dragBoxBy(page, 96, 72);
    const after = await page.getByTestId("gesture-drag-box").boundingBox();

    expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(8);
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(8);
  });
});
