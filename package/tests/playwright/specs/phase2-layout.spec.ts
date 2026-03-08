import { expect, test, type Page } from "@playwright/test";
import { loadScenario, runAction, waitForState } from "../utils/harness-client";

type TransformSample = {
  frame: number;
  transform: string | null;
};

type ScaleSample = TransformSample & {
  scaleX: number;
  scaleY: number;
};

type TopLayerSample = TransformSample & {
  topTestId: string | null;
  topTag: string | null;
  opacity: string;
  containsTarget: boolean;
};

type SharedShellSample = {
  frame: number;
  transform: string | null;
  borderTopLeftRadius: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

const sampledTransformAnimation = async (page: Page, testId: string) => {
  return page.evaluate(
    async ({ testId }) => {
      const readTransform = () => {
        const element = document.querySelector(
          `[data-testid="${testId}"]`,
        ) as HTMLElement | null;

        return element ? getComputedStyle(element).transform : null;
      };

      const samples: Array<string | null> = [];

      for (let i = 0; i < 12; i += 1) {
        samples.push(readTransform());
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }

      return samples.some((value) => value !== null && value !== "none");
    },
    { testId },
  );
};

const sampledScaleContinuity = async (page: Page, testId: string) => {
  return page.evaluate(
    async ({ testId }) => {
      const samples: ScaleSample[] = [];

      for (let i = 0; i < 12; i += 1) {
        const element = document.querySelector(
          `[data-testid="${testId}"]`,
        ) as HTMLElement | null;

        const transform = element ? getComputedStyle(element).transform : null;
        const rect = element?.getBoundingClientRect();
        const width = element?.offsetWidth ?? 0;
        const height = element?.offsetHeight ?? 0;
        const scaleX = width > 0 && rect ? rect.width / width : 1;
        const scaleY = height > 0 && rect ? rect.height / height : 1;

        samples.push({
          frame: i,
          transform,
          scaleX,
          scaleY,
        });

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }

      return samples;
    },
    { testId },
  );
};

const sampledTopLayerContinuity = async (page: Page, testId: string) => {
  return page.evaluate(
    async ({ testId }) => {
      const samples: TopLayerSample[] = [];
      let hasAnimated = false;

      for (let i = 0; i < 16; i += 1) {
        const element = document.querySelector(
          `[data-testid="${testId}"]`,
        ) as HTMLElement | null;

        if (!element) return samples;

        const transform = getComputedStyle(element).transform;
        hasAnimated ||= transform !== "none";

        if (hasAnimated) {
          const rect = element.getBoundingClientRect();
          const topElement = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          ) as HTMLElement | null;

          samples.push({
            frame: i,
            transform,
            topTestId: topElement?.getAttribute("data-testid") ?? null,
            topTag: topElement?.tagName ?? null,
            opacity: getComputedStyle(element).opacity,
            containsTarget: Boolean(topElement && element.contains(topElement)),
          });
        }

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }

      return samples;
    },
    { testId },
  );
};

const sampledSharedShellContinuity = async (page: Page, testId: string) => {
  return page.evaluate(
    async ({ testId }) => {
      const samples: SharedShellSample[] = [];

      for (let i = 0; i < 16; i += 1) {
        const element = document.querySelector(
          `[data-testid="${testId}"]`,
        ) as HTMLElement | null;

        if (!element) return samples;

        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        samples.push({
          frame: i,
          transform: style.transform,
          borderTopLeftRadius: style.borderTopLeftRadius,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }

      return samples;
    },
    { testId },
  );
};

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

  test("expanding a middle card animates lower siblings instead of snapping", async ({
    page,
  }) => {
    await runAction(page, "setExpandedDetail", null);

    const before = await page.getByTestId("layout-expand-search").boundingBox();

    await runAction(page, "setExpandedDetail", "feed");
    await waitForState(page, "expandedDetailId", "feed");

    expect(await sampledTransformAnimation(page, "layout-expand-search")).toBe(
      true,
    );

    await expect
      .poll(async () => {
        const box = await page
          .getByTestId("layout-expand-search")
          .boundingBox();
        return box?.y ?? 0;
      })
      .toBeGreaterThan((before?.y ?? 0) + 20);
  });

  test("switching expansion from the top card to the middle card keeps sibling reflow animated", async ({
    page,
  }) => {
    await runAction(page, "setExpandedDetail", "sync");
    await waitForState(page, "expandedDetailId", "sync");
    await expect(page.getByTestId("layout-expand-detail-sync")).toHaveCount(1);

    await runAction(page, "setExpandedDetail", "feed");
    await waitForState(page, "expandedDetailId", "feed");
    await expect(page.getByTestId("layout-expand-detail-feed")).toHaveCount(1);

    expect(await sampledTransformAnimation(page, "layout-expand-feed")).toBe(
      true,
    );
    expect(await sampledTransformAnimation(page, "layout-expand-sync")).toBe(
      true,
    );
  });

  test("position-only wrappers avoid scale distortion while a card expands", async ({
    page,
  }) => {
    await runAction(page, "setExpandedDetail", null);
    await runAction(page, "setExpandedDetail", "feed");
    await waitForState(page, "expandedDetailId", "feed");

    const samples = await sampledScaleContinuity(
      page,
      "layout-expand-header-feed",
    );
    const animatedSamples = samples.filter(
      (sample) => sample.transform !== null && sample.transform !== "none",
    );

    expect(animatedSamples.length).toBeGreaterThan(0);
    expect(
      animatedSamples.every((sample) => {
        return (
          Math.abs(sample.scaleX - 1) < 0.02 &&
          Math.abs(sample.scaleY - 1) < 0.02
        );
      }),
    ).toBe(true);
  });

  test("shared layout shell animates on open and stays visually on top", async ({
    page,
  }) => {
    await page.getByTestId("layout-foreground-stage").scrollIntoViewIfNeeded();
    await runAction(page, "openForeground", "alpha");
    await waitForState(page, "foregroundOpenId", "alpha");
    await expect(page.getByTestId("layout-foreground-modal-alpha")).toHaveCount(
      1,
    );

    expect(
      await sampledTransformAnimation(page, "layout-foreground-modal-alpha"),
    ).toBe(true);

    const samples = await sampledTopLayerContinuity(
      page,
      "layout-foreground-modal-square-alpha",
    );

    expect(samples.length).toBeGreaterThan(0);
    expect(
      samples.every((sample) => sample.containsTarget),
      JSON.stringify(samples),
    ).toBe(true);
  });

  test("shared text handoff stays position-only during the foreground transition", async ({
    page,
  }) => {
    await runAction(page, "openForeground", "alpha");
    await waitForState(page, "foregroundOpenId", "alpha");
    await expect(page.getByTestId("layout-foreground-modal-alpha")).toHaveCount(
      1,
    );

    const samples = await sampledScaleContinuity(
      page,
      "layout-foreground-modal-text-alpha",
    );
    const animatedSamples = samples.filter(
      (sample) => sample.transform !== null && sample.transform !== "none",
    );

    expect(animatedSamples.length).toBeGreaterThan(0);
    expect(
      animatedSamples.every((sample) => {
        return (
          Math.abs(sample.scaleX - 1) < 0.02 &&
          Math.abs(sample.scaleY - 1) < 0.02
        );
      }),
    ).toBe(true);
  });

  test("shared layout shell animates back into the row on close", async ({
    page,
  }) => {
    await runAction(page, "openForeground", "alpha");
    await waitForState(page, "foregroundOpenId", "alpha");
    await expect(page.getByTestId("layout-foreground-modal-alpha")).toHaveCount(
      1,
    );

    await runAction(page, "closeForeground");
    await waitForState(page, "foregroundOpenId", null);

    expect(
      await sampledTransformAnimation(page, "layout-foreground-row-alpha"),
    ).toBe(true);
  });

  test("shared layout shell resumes when reopened during the close animation", async ({
    page,
  }) => {
    await runAction(page, "openForeground", "alpha");
    await waitForState(page, "foregroundOpenId", "alpha");
    await expect(page.getByTestId("layout-foreground-modal-alpha")).toHaveCount(
      1,
    );

    await runAction(page, "closeForeground");
    await page.waitForTimeout(60);
    await runAction(page, "openForeground", "alpha");
    await waitForState(page, "foregroundOpenId", "alpha");
    await expect(page.getByTestId("layout-foreground-modal-alpha")).toHaveCount(
      1,
    );

    const samples = await sampledSharedShellContinuity(
      page,
      "layout-foreground-modal-alpha",
    );
    const animatedSamples = samples.filter(
      (sample) => sample.transform !== null && sample.transform !== "none",
    );
    const finalSample = samples[samples.length - 1];

    expect(animatedSamples.length).toBeGreaterThan(0);
    expect(
      samples.every((sample) => sample.borderTopLeftRadius !== "0px"),
      JSON.stringify(samples),
    ).toBe(true);
    expect(
      samples.some((sample) => {
        if (!finalSample) return false;

        return (
          Math.abs(sample.top - finalSample.top) > 1 ||
          Math.abs(sample.left - finalSample.left) > 1 ||
          Math.abs(sample.width - finalSample.width) > 1 ||
          Math.abs(sample.height - finalSample.height) > 1
        );
      }),
      JSON.stringify(samples),
    ).toBe(true);
  });
});
