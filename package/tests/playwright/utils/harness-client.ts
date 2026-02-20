import { expect, type Page } from "@playwright/test";

export type HarnessScenarioName =
  | "callbacks"
  | "presence"
  | "layout"
  | "viewport-orchestration"
  | "reduced-motion"
  | "keyboard";

export interface HarnessEvent {
  id: number;
  time: number;
  scenario: HarnessScenarioName;
  type: string;
  node?: string;
  payload?: unknown;
}

type HarnessWindow = Window & {
  __MOTION_HARNESS_READY__?: boolean;
  __MOTION_HARNESS__?: {
    loadScenario?: (
      scenario: HarnessScenarioName,
      options?: Record<string, unknown>,
    ) => void;
    act?: (action: string, payload?: unknown) => void;
    getState?: () => Record<string, unknown>;
    getEvents?: () => HarnessEvent[];
    clearEvents?: () => void;
  };
};

const harnessPath = "/";

const waitForHarnessReady = async (page: Page) => {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const harnessWindow = window as HarnessWindow;

          return Boolean(
            harnessWindow.__MOTION_HARNESS_READY__ &&
            harnessWindow.__MOTION_HARNESS__,
          );
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
};

const gotoHarnessPage = async (page: Page) => {
  await page.goto(harnessPath, { waitUntil: "domcontentloaded" });

  try {
    await waitForHarnessReady(page);
  } catch {
    await page.goto(harnessPath, { waitUntil: "domcontentloaded" });
    await waitForHarnessReady(page);
  }
};

export const loadScenario = async (
  page: Page,
  scenario: HarnessScenarioName,
  options?: Record<string, unknown>,
) => {
  await gotoHarnessPage(page);

  await page.evaluate(
    ({ name, options }) => {
      const harnessWindow = window as HarnessWindow;
      harnessWindow.__MOTION_HARNESS__?.loadScenario?.(name, options);
    },
    { name: scenario, options: options ?? {} },
  );

  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const harnessWindow = window as HarnessWindow;
        return harnessWindow.__MOTION_HARNESS__?.getState?.().scenario ?? null;
      });
    })
    .toBe(scenario);
};

export const clearEvents = async (page: Page) => {
  await page.evaluate(() => {
    const harnessWindow = window as HarnessWindow;
    harnessWindow.__MOTION_HARNESS__?.clearEvents?.();
  });
};

export const runAction = async (
  page: Page,
  action: string,
  payload?: unknown,
) => {
  await page.evaluate(
    ({ action, payload }) => {
      const harnessWindow = window as HarnessWindow;
      harnessWindow.__MOTION_HARNESS__?.act?.(action, payload);
    },
    { action, payload },
  );
};

export const readEvents = async (page: Page): Promise<HarnessEvent[]> => {
  return page.evaluate(() => {
    const harnessWindow = window as HarnessWindow;
    return harnessWindow.__MOTION_HARNESS__?.getEvents?.() ?? [];
  });
};

export const readState = async (
  page: Page,
): Promise<Record<string, unknown>> => {
  return page.evaluate(() => {
    const harnessWindow = window as HarnessWindow;
    return harnessWindow.__MOTION_HARNESS__?.getState?.() ?? {};
  });
};

export const waitForEventCount = async (
  page: Page,
  eventType: string,
  count: number,
  node?: string,
  timeout: number = 8_000,
) => {
  await expect
    .poll(
      async () => {
        const events = await readEvents(page);
        return events.filter(
          (event) =>
            event.type === eventType && (node ? event.node === node : true),
        ).length;
      },
      { timeout },
    )
    .toBeGreaterThanOrEqual(count);
};

export const waitForState = async (
  page: Page,
  key: string,
  expected: unknown,
  timeout: number = 8_000,
) => {
  await expect
    .poll(
      async () => {
        const state = await readState(page);
        return state[key] ?? null;
      },
      { timeout },
    )
    .toEqual(expected);
};
