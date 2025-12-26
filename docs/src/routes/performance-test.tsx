import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
} from "solid-js";
import { motion } from "motion-solid";

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function PerformanceTest() {
  const [count, setCount] = createSignal(240);
  const [columns, setColumns] = createSignal(12);
  const [autoStep, setAutoStep] = createSignal(false);
  const [intervalMs, setIntervalMs] = createSignal(200);
  const [tick, setTick] = createSignal(0);
  const [jitter, setJitter] = createSignal(true);

  const items = createMemo(() =>
    Array.from({ length: count() }, (_, index) => index),
  );

  createEffect(() => {
    if (!autoStep()) return;

    const id = setInterval(() => {
      setTick((value) => value + 1);
    }, intervalMs());

    onCleanup(() => clearInterval(id));
  });

  const heightForIndex = (index: number) => {
    if (!jitter()) return 28;
    const phase = (tick() + index) % 8;
    return 24 + phase * 4;
  };

  return (
    <div class="min-h-screen text-foreground">
      <div class="mx-auto max-w-6xl px-6 mt-40 pt-36 pb-16">
        <div class="flex flex-col gap-2">
          <h1 class="text-3xl md:text-4xl font-semibold tracking-tight">
            Layout Performance Test
          </h1>
          <p class="text-sm text-muted-foreground max-w-2xl">
            Use this page to stress layout animations with frequent state
            updates.
          </p>
        </div>

        <div class="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div class="rounded-xl border border-border bg-card/80 p-5 shadow-sm">
            <div class="space-y-4">
              <div>
                <label class="text-xs uppercase tracking-wide text-muted-foreground">
                  Items
                </label>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  value={count()}
                  onInput={(event) => {
                    const next = clampNumber(
                      parseNumber(event.currentTarget.value, count()),
                      0,
                      2000,
                    );
                    setCount(next);
                  }}
                  class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label class="text-xs uppercase tracking-wide text-muted-foreground">
                  Columns
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={columns()}
                  onInput={(event) => {
                    const next = clampNumber(
                      parseNumber(event.currentTarget.value, columns()),
                      1,
                      24,
                    );
                    setColumns(next);
                  }}
                  class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label class="text-xs uppercase tracking-wide text-muted-foreground">
                  Step Interval (ms)
                </label>
                <input
                  type="number"
                  min={16}
                  max={2000}
                  value={intervalMs()}
                  onInput={(event) => {
                    const next = clampNumber(
                      parseNumber(event.currentTarget.value, intervalMs()),
                      16,
                      2000,
                    );
                    setIntervalMs(next);
                  }}
                  class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div class="flex flex-col gap-3 text-sm">
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoStep()}
                    onChange={(event) =>
                      setAutoStep(event.currentTarget.checked)
                    }
                  />
                  Auto-step
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={jitter()}
                    onChange={(event) => setJitter(event.currentTarget.checked)}
                  />
                  Jitter item heights
                </label>
              </div>

              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
                  onClick={() => setTick((value) => value + 1)}
                >
                  Step
                </button>
                <button
                  type="button"
                  class="rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
                  onClick={() => setTick(0)}
                >
                  Reset tick
                </button>
              </div>

              <div class="rounded-lg border border-border bg-background/70 p-3 text-xs text-muted-foreground">
                <div>Tick: {tick()}</div>
                <div>Items: {items().length}</div>
                <div>Columns: {columns()}</div>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-border bg-card/40 p-4">
            <motion.div
              layout
              layoutDependencies={[items, tick, jitter, columns]}
              class="grid gap-2"
              style={{
                "grid-template-columns": `repeat(${columns()}, minmax(0, 1fr))`,
              }}
            >
              <For each={items()}>
                {(index) => (
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 450, damping: 40 }}
                    class="rounded-md border border-primary/30 bg-primary/15"
                    style={{ height: `${heightForIndex(index)}px` }}
                  />
                )}
              </For>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
