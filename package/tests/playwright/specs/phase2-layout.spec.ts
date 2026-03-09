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
  intersectsViewport: boolean;
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

type LayoutBoxSample = {
  frame: number;
  top: number | null;
  left: number | null;
  height: number | null;
  transform: string | null;
};

type HarnessWindow = Window & {
  __MOTION_HARNESS__?: {
    act?: (action: string, payload?: unknown) => void;
  };
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

const sampledActionLayoutBoxes = async (
  page: Page,
  action: string,
  payload: unknown,
  testIds: string[],
  frames: number = 20,
) => {
  return page.evaluate(
    async ({ action, payload, testIds, frames }) => {
      const harnessWindow = window as HarnessWindow;
      const samples = Object.fromEntries(
        testIds.map((testId) => [testId, [] as LayoutBoxSample[]]),
      ) as Record<string, LayoutBoxSample[]>;

      harnessWindow.__MOTION_HARNESS__?.act?.(action, payload);

      for (let i = 0; i < frames; i += 1) {
        for (const testId of testIds) {
          const element = document.querySelector(
            `[data-testid="${testId}"]`,
          ) as HTMLElement | null;
          const rect = element?.getBoundingClientRect();
          const elementSamples = samples[testId] ?? (samples[testId] = []);

          elementSamples.push({
            frame: i,
            top: rect?.top ?? null,
            left: rect?.left ?? null,
            height: rect?.height ?? null,
            transform: element ? getComputedStyle(element).transform : null,
          });
        }

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }

      return samples;
    },
    { action, payload, testIds, frames },
  );
};

const sampledActionTopLayerContinuity = async (
  page: Page,
  action: string,
  payload: unknown,
  testIds: string | string[],
) => {
  return page.evaluate(
    async ({ action, payload, testIds }) => {
      const harnessWindow = window as HarnessWindow;
      const samples: TopLayerSample[] = [];
      const ids = Array.isArray(testIds) ? testIds : [testIds];

      harnessWindow.__MOTION_HARNESS__?.act?.(action, payload);

      for (let i = 0; i < 16; i += 1) {
        const elements = ids
          .map(
            (testId) =>
              document.querySelector(
                `[data-testid="${testId}"]`,
              ) as HTMLElement | null,
          )
          .filter((element): element is HTMLElement => element !== null);
        const element =
          elements[0] ??
          (document.querySelector(
            `[data-testid="${ids[0]}"]`,
          ) as HTMLElement | null);

        if (!element) return samples;

        const transform = getComputedStyle(element).transform;
        const rect = element.getBoundingClientRect();
        const visibleLeft = Math.max(rect.left, 0);
        const visibleTop = Math.max(rect.top, 0);
        const visibleRight = Math.min(rect.right, window.innerWidth);
        const visibleBottom = Math.min(rect.bottom, window.innerHeight);
        const intersectsViewport =
          visibleRight > visibleLeft && visibleBottom > visibleTop;
        const sampleX = intersectsViewport
          ? visibleLeft + (visibleRight - visibleLeft) / 2
          : null;
        const sampleY = intersectsViewport
          ? visibleTop + (visibleBottom - visibleTop) / 2
          : null;
        const topElement =
          sampleX !== null && sampleY !== null
            ? (document.elementFromPoint(
                sampleX,
                sampleY,
              ) as HTMLElement | null)
            : null;

        samples.push({
          frame: i,
          transform,
          topTestId: topElement?.getAttribute("data-testid") ?? null,
          topTag: topElement?.tagName ?? null,
          opacity: getComputedStyle(element).opacity,
          intersectsViewport,
          containsTarget: Boolean(
            topElement &&
            elements.some(
              (candidate) =>
                candidate === topElement || candidate.contains(topElement),
            ),
          ),
        });

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }

      return samples;
    },
    { action, payload, testIds },
  );
};

const sampledActionSharedShellContinuity = async (
  page: Page,
  action: string,
  payload: unknown,
  testId: string,
) => {
  return page.evaluate(
    async ({ action, payload, testId }) => {
      const harnessWindow = window as HarnessWindow;
      const samples: SharedShellSample[] = [];

      harnessWindow.__MOTION_HARNESS__?.act?.(action, payload);

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
    { action, payload, testId },
  );
};

const readElementTops = async (page: Page, testIds: string[]) => {
  return page.evaluate(
    ({ testIds }) => {
      return Object.fromEntries(
        testIds.map((testId) => {
          const element = document.querySelector(
            `[data-testid="${testId}"]`,
          ) as HTMLElement | null;

          return [testId, element?.getBoundingClientRect().top ?? null];
        }),
      ) as Record<string, number | null>;
    },
    { testIds },
  );
};

const hasInFlightLayoutMovement = (samples: LayoutBoxSample[]) => {
  const positionedSamples = samples.filter(
    (sample): sample is LayoutBoxSample & { top: number } =>
      sample.top !== null,
  );
  if (!positionedSamples.length) return false;

  const hasAnimatedTransform = positionedSamples.some(
    (sample) => sample.transform !== null && sample.transform !== "none",
  );
  const roundedTops = new Set(
    positionedSamples.map((sample) => Math.round(sample.top)),
  );
  const tops = positionedSamples.map((sample) => sample.top);
  const minTop = Math.min(...tops);
  const maxTop = Math.max(...tops);

  return hasAnimatedTransform && roundedTops.size >= 4 && maxTop - minTop > 8;
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

  test("expanding a middle card animates lower siblings without LayoutGroup instead of snapping", async ({
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

  test("alternating expanded cards keeps sibling reflow animated on every cycle without LayoutGroup", async ({
    page,
  }) => {
    const rowIds = ["sync", "feed", "invite", "search"];
    const testIds = rowIds.map((id) => `layout-expand-${id}`);
    const sequence = [
      "invite",
      "feed",
      "invite",
      "feed",
      "invite",
      "feed",
      "invite",
      "feed",
      "invite",
      "feed",
      "invite",
      "feed",
      "invite",
      "feed",
    ] as const;

    await runAction(page, "setExpandedDetail", "feed");
    await waitForState(page, "expandedDetailId", "feed");
    await page.waitForTimeout(450);

    let previousTops = await readElementTops(page, testIds);

    for (const target of sequence) {
      const samples = await sampledActionLayoutBoxes(
        page,
        "setExpandedDetail",
        target,
        testIds,
      );
      await waitForState(page, "expandedDetailId", target);
      await page.waitForTimeout(450);

      const nextTops = await readElementTops(page, testIds);
      const movedSiblingIds = rowIds.filter((id) => {
        if (target !== null && id === target) return false;

        const testId = `layout-expand-${id}`;
        const previousTop = previousTops[testId] ?? null;
        const nextTop = nextTops[testId] ?? null;

        return (
          previousTop !== null &&
          nextTop !== null &&
          Math.abs(nextTop - previousTop) > 8
        );
      });

      expect(
        movedSiblingIds.length,
        `No moved siblings detected for ${String(target)}.`,
      ).toBeGreaterThan(0);

      for (const id of movedSiblingIds) {
        const testId = `layout-expand-${id}`;

        expect(
          hasInFlightLayoutMovement(samples[testId] ?? []),
          `${String(target)} -> ${id}: ${JSON.stringify(samples[testId] ?? [])}`,
        ).toBe(true);
      }

      previousTops = nextTops;
    }
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
    await page
      .getByTestId("layout-foreground-stage")
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    const samples = await sampledActionTopLayerContinuity(
      page,
      "openForeground",
      "alpha",
      "layout-foreground-modal-alpha",
    );
    await waitForState(page, "foregroundOpenId", "alpha");
    await expect(page.getByTestId("layout-foreground-modal-alpha")).toHaveCount(
      1,
    );

    expect(
      samples.some(
        (sample) => sample.transform !== null && sample.transform !== "none",
      ),
    ).toBe(true);

    const animatedSamples = samples.filter(
      (sample) =>
        sample.transform !== null &&
        sample.transform !== "none" &&
        sample.intersectsViewport,
    );

    expect(samples.length).toBeGreaterThan(0);
    expect(animatedSamples.length).toBeGreaterThan(1);
    expect(
      animatedSamples.every((sample) => sample.containsTarget),
      JSON.stringify(animatedSamples),
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

  test("alternating foreground cards keeps border-radius correction on open and stays on top while closing", async ({
    page,
  }) => {
    const sequence = ["alpha", "beta", "gamma", "alpha", "beta", "gamma"];

    await page
      .getByTestId("layout-foreground-stage")
      .evaluate((element) => element.scrollIntoView({ block: "center" }));

    for (const id of sequence) {
      const openSamples = await sampledActionSharedShellContinuity(
        page,
        "openForeground",
        id,
        `layout-foreground-modal-${id}`,
      );

      await waitForState(page, "foregroundOpenId", id);
      await expect(
        page.getByTestId(`layout-foreground-modal-${id}`),
      ).toHaveCount(1);

      expect(openSamples.length, JSON.stringify(openSamples)).toBeGreaterThan(
        0,
      );
      expect(
        openSamples.some(
          (sample) => sample.transform !== null && sample.transform !== "none",
        ),
        JSON.stringify(openSamples),
      ).toBe(true);
      expect(
        openSamples.every((sample) => sample.borderTopLeftRadius !== "0px"),
        JSON.stringify(openSamples),
      ).toBe(true);

      const closeSamples = await sampledActionTopLayerContinuity(
        page,
        "closeForeground",
        null,
        [`layout-foreground-row-${id}`, `layout-foreground-modal-${id}`],
      );

      await waitForState(page, "foregroundOpenId", null);

      expect(closeSamples.length, JSON.stringify(closeSamples)).toBeGreaterThan(
        0,
      );
      const animatedCloseSamples = closeSamples.filter(
        (sample) => sample.transform !== null && sample.transform !== "none",
      );
      expect(
        animatedCloseSamples.length,
        JSON.stringify(closeSamples),
      ).toBeGreaterThan(1);
      expect(
        animatedCloseSamples.slice(1).every((sample) => sample.containsTarget),
        JSON.stringify(animatedCloseSamples),
      ).toBe(true);

      await page.waitForTimeout(220);
    }
  });
});
