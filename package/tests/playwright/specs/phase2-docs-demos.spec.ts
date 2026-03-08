import { expect, test, type Page } from "@playwright/test";

const docsBaseUrl = "http://127.0.0.1:4311";

type ForegroundOpenFrame = {
  frame: number;
  squareColor: string | null;
  shellBorderTopLeftRadius: string | null;
  shellTransform: string | null;
};

type ForegroundCloseFrame = {
  frame: number;
  containsTarget: boolean;
  targetTestText: string | null;
  shellBorderTopLeftRadius: string | null;
  shellTransform: string | null;
};

type ForegroundCycle = {
  title: string;
  expectedColor: string;
  openFrames: ForegroundOpenFrame[];
  closeFrames: ForegroundCloseFrame[];
};

type LayoutBoxSample = {
  frame: number;
  top: number | null;
  transform: string | null;
};

const loadDocsDemos = async (page: Page) => {
  await page.goto(`${docsBaseUrl}/docs/demos`, { waitUntil: "networkidle" });
};

const runForegroundCycles = async (page: Page, cadenceMs: number) => {
  return page.evaluate(
    async ({ cadenceMs }) => {
      const sequence = [
        { title: "Release notes", color: "rgb(37, 99, 235)" },
        { title: "Migration prep", color: "rgb(234, 88, 12)" },
        { title: "Support handoff", color: "rgb(5, 150, 105)" },
        { title: "Release notes", color: "rgb(37, 99, 235)" },
      ] as const;

      const raf = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const delay = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));

      const findDemo = (name: string) => {
        const headers = [
          ...document.querySelectorAll(
            "div.text-sm.font-medium.text-muted-foreground",
          ),
        ];
        const header = headers.find((el) => el.textContent?.trim() === name);
        return header?.closest(".not-prose") as HTMLElement | null;
      };

      const findRowButton = (demo: HTMLElement, title: string) => {
        const buttons = [...demo.querySelectorAll("button")];
        return (buttons.find((button) => {
          const text = button.textContent?.replace(/\s+/g, " ").trim() ?? "";
          return text.startsWith(title);
        }) ?? null) as HTMLButtonElement | null;
      };

      const findCloseButton = (demo: HTMLElement) => {
        const buttons = [...demo.querySelectorAll("button")];
        return (buttons.find(
          (button) => button.textContent?.trim() === "Close",
        ) ?? null) as HTMLButtonElement | null;
      };

      const readOpenFrame = (demo: HTMLElement): ForegroundOpenFrame => {
        const shell = findCloseButton(demo)?.closest(
          "div.w-full",
        ) as HTMLElement | null;
        const coloredSquares = [...demo.querySelectorAll("div")]
          .map((element) => element as HTMLElement)
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return (
              rect.width >= 40 &&
              rect.height >= 40 &&
              rect.width <= 150 &&
              rect.height <= 150 &&
              style.backgroundColor !== "rgba(0, 0, 0, 0)"
            );
          })
          .sort(
            (left, right) =>
              right.getBoundingClientRect().width -
              left.getBoundingClientRect().width,
          );
        const square = coloredSquares[0] ?? null;

        return {
          frame: 0,
          squareColor: square ? getComputedStyle(square).backgroundColor : null,
          shellBorderTopLeftRadius: shell
            ? getComputedStyle(shell).borderTopLeftRadius
            : null,
          shellTransform: shell ? getComputedStyle(shell).transform : null,
        };
      };

      const readCloseFrame = (
        demo: HTMLElement,
        title: string,
      ): ForegroundCloseFrame => {
        const candidates = [...demo.querySelectorAll("div")]
          .map((element) => element as HTMLElement)
          .filter((element) => {
            const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
            if (!text.includes(title)) return false;

            const rect = element.getBoundingClientRect();
            if (rect.width < 200 || rect.height < 40) return false;

            return element.className.includes("bg-card");
          })
          .sort(
            (left, right) =>
              right.getBoundingClientRect().height -
              left.getBoundingClientRect().height,
          );
        const shell = candidates[0] ?? null;

        if (!shell) {
          return {
            frame: 0,
            containsTarget: false,
            targetTestText: null,
            shellBorderTopLeftRadius: null,
            shellTransform: null,
          };
        }

        const rect = shell.getBoundingClientRect();
        const topElement = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height * 0.75,
        ) as HTMLElement | null;

        return {
          frame: 0,
          containsTarget: Boolean(topElement && shell.contains(topElement)),
          targetTestText:
            topElement?.textContent
              ?.replace(/\s+/g, " ")
              .trim()
              .slice(0, 120) ?? null,
          shellBorderTopLeftRadius: getComputedStyle(shell).borderTopLeftRadius,
          shellTransform: getComputedStyle(shell).transform,
        };
      };

      const demo = findDemo("Foreground Card Layout");
      if (!demo) return [];

      demo.scrollIntoView({ block: "center" });

      const cycles: ForegroundCycle[] = [];

      for (const step of sequence) {
        const rowButton = findRowButton(demo, step.title);
        rowButton?.click();

        const openFrames: ForegroundOpenFrame[] = [];
        for (let i = 0; i < 8; i += 1) {
          await raf();
          openFrames.push({ ...readOpenFrame(demo), frame: i });
        }

        await delay(cadenceMs);

        findCloseButton(demo)?.click();

        const closeFrames: ForegroundCloseFrame[] = [];
        for (let i = 0; i < 8; i += 1) {
          await raf();
          closeFrames.push({ ...readCloseFrame(demo, step.title), frame: i });
        }

        await delay(cadenceMs);

        cycles.push({
          title: step.title,
          expectedColor: step.color,
          openFrames,
          closeFrames,
        });
      }

      return cycles;
    },
    { cadenceMs },
  );
};

const sampledDocsListAlternation = async (
  page: Page,
  cadenceMs: number,
  frames: number,
) => {
  return page.evaluate(
    async ({ cadenceMs, frames }) => {
      const titles = [
        "Sync profile settings",
        "Reduce feed jank",
        "Tighten invite flow",
        "Search result polish",
      ] as const;
      const sequence = [
        "Reduce feed jank",
        "Search result polish",
        "Reduce feed jank",
        "Search result polish",
        "Reduce feed jank",
        "Search result polish",
        "Reduce feed jank",
        "Search result polish",
        "Reduce feed jank",
        "Search result polish",
        "Reduce feed jank",
        "Search result polish",
      ] as const;

      const raf = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const delay = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));

      const findDemo = (name: string) => {
        const headers = [
          ...document.querySelectorAll(
            "div.text-sm.font-medium.text-muted-foreground",
          ),
        ];
        const header = headers.find((el) => el.textContent?.trim() === name);
        return header?.closest(".not-prose") as HTMLElement | null;
      };

      const findCardButton = (demo: HTMLElement, title: string) => {
        const buttons = [...demo.querySelectorAll("button")];
        return (buttons.find((button) => {
          const text = button.textContent?.replace(/\s+/g, " ").trim() ?? "";
          return text.startsWith(title);
        }) ?? null) as HTMLButtonElement | null;
      };

      const readCard = (
        demo: HTMLElement,
        title: string,
      ): LayoutBoxSample | null => {
        const element = findCardButton(demo, title);
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        return {
          frame: 0,
          top: rect.top,
          transform: style.transform,
        };
      };

      const demo = findDemo("Reshuffling List Layout Animation");
      if (!demo) return [];

      demo.scrollIntoView({ block: "center" });

      let previous = Object.fromEntries(
        titles.map((title) => [title, readCard(demo, title)]),
      ) as Record<(typeof titles)[number], LayoutBoxSample | null>;

      const cycles: Array<{
        target: string;
        frames: Record<(typeof titles)[number], LayoutBoxSample[]>;
        finalTops: Record<(typeof titles)[number], number | null>;
        previousTops: Record<(typeof titles)[number], number | null>;
      }> = [];

      for (const target of sequence) {
        findCardButton(demo, target)?.click();

        const cycleFrames = Object.fromEntries(
          titles.map((title) => [title, [] as LayoutBoxSample[]]),
        ) as Record<(typeof titles)[number], LayoutBoxSample[]>;

        for (let i = 0; i < frames; i += 1) {
          await raf();

          for (const title of titles) {
            const sample = readCard(demo, title);
            cycleFrames[title].push({
              frame: i,
              top: sample?.top ?? null,
              transform: sample?.transform ?? null,
            });
          }
        }

        await delay(cadenceMs);

        const finalTops = Object.fromEntries(
          titles.map((title) => [title, readCard(demo, title)?.top ?? null]),
        ) as Record<(typeof titles)[number], number | null>;

        const previousTops = Object.fromEntries(
          titles.map((title) => [title, previous[title]?.top ?? null]),
        ) as Record<(typeof titles)[number], number | null>;

        cycles.push({
          target,
          frames: cycleFrames,
          finalTops,
          previousTops,
        });

        previous = Object.fromEntries(
          titles.map((title) => [title, readCard(demo, title)]),
        ) as Record<(typeof titles)[number], LayoutBoxSample | null>;
      }

      return cycles;
    },
    { cadenceMs, frames },
  );
};

const hasContinuousLayoutMovement = (
  samples: LayoutBoxSample[],
  finalTop: number | null,
) => {
  if (finalTop === null) return false;

  const positionedSamples = samples.filter(
    (sample): sample is LayoutBoxSample & { top: number } =>
      sample.top !== null,
  );
  if (!positionedSamples.length) return false;

  const hasAnimatedTransform = positionedSamples.some(
    (sample) => sample.transform !== null && sample.transform !== "none",
  );
  const tops = positionedSamples.map((sample) => sample.top);
  const minTop = Math.min(...tops);
  const maxTop = Math.max(...tops);
  const hasVisibleTravel = maxTop - minTop > 8;
  const reachesFinalPosition = positionedSamples.some(
    (sample) => Math.abs(sample.top - finalTop) < 2,
  );

  return hasAnimatedTransform && hasVisibleTravel && reachesFinalPosition;
};

test.describe("phase2 docs demos", () => {
  test("foreground shared layout keeps the correct visual identity across rapid card cycles", async ({
    page,
  }) => {
    await loadDocsDemos(page);

    const cycles = await runForegroundCycles(page, 420);

    expect(cycles.length).toBeGreaterThan(0);

    for (const cycle of cycles) {
      for (const frame of cycle.openFrames.slice(0, 4)) {
        expect(
          frame.squareColor,
          `${cycle.title} open frame ${frame.frame}: ${JSON.stringify(frame)}`,
        ).toBe(cycle.expectedColor);
        expect(
          frame.shellBorderTopLeftRadius,
          `${cycle.title} border radius frame ${frame.frame}: ${JSON.stringify(frame)}`,
        ).not.toMatch(/^0(?:px|%)/);
      }
    }
  });

  test("foreground shared layout stays visually on top while shrinking back into the list", async ({
    page,
  }) => {
    await loadDocsDemos(page);

    const cycles = await runForegroundCycles(page, 420);

    expect(cycles.length).toBeGreaterThan(0);

    for (const cycle of cycles) {
      const animatedCloseFrames = cycle.closeFrames.filter(
        (frame) =>
          frame.shellTransform !== null && frame.shellTransform !== "none",
      );

      expect(
        animatedCloseFrames.length,
        `${cycle.title} close frames: ${JSON.stringify(cycle.closeFrames)}`,
      ).toBeGreaterThan(0);

      for (const frame of animatedCloseFrames.slice(0, 4)) {
        expect(
          frame.containsTarget,
          `${cycle.title} close frame ${frame.frame}: ${JSON.stringify(frame)}`,
        ).toBe(true);
      }
    }
  });

  test("reshuffling list keeps sibling reflow continuous across repeated alternation", async ({
    page,
  }) => {
    await loadDocsDemos(page);

    const cycles = await sampledDocsListAlternation(page, 450, 18);

    expect(cycles.length).toBeGreaterThan(0);

    for (const cycle of cycles) {
      const movedTitles = (
        Object.keys(cycle.finalTops) as Array<keyof typeof cycle.finalTops>
      ).filter((title) => {
        if (title === cycle.target) return false;

        const previousTop = cycle.previousTops[title] ?? null;
        const finalTop = cycle.finalTops[title] ?? null;

        return (
          previousTop !== null &&
          finalTop !== null &&
          Math.abs(finalTop - previousTop) > 8
        );
      });

      expect(
        movedTitles.length,
        `${cycle.target} moved titles: ${JSON.stringify(cycle)}`,
      ).toBeGreaterThan(0);

      for (const title of movedTitles) {
        expect(
          hasContinuousLayoutMovement(
            cycle.frames[title] ?? [],
            cycle.finalTops[title] ?? null,
          ),
          `${cycle.target} -> ${title}: ${JSON.stringify(cycle.frames[title] ?? [])}`,
        ).toBe(true);
      }
    }
  });
});
