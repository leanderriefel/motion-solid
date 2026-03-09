import { For, Show, createMemo, createSignal } from "solid-js";
import { AnimatePresence, motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./complex-layout-animation.tsx?raw";

type QueueItem = {
  id: string;
  title: string;
  owner: string;
  impact: number;
  speed: number;
  detail: string;
  accent: string;
};

const queue: readonly QueueItem[] = [
  {
    id: "sync",
    title: "Sync profile settings",
    owner: "Platform",
    impact: 92,
    speed: 44,
    detail: "Touches auth, preferences, and the app shell in one pass.",
    accent: "bg-sky-500",
  },
  {
    id: "feed",
    title: "Reduce feed jank",
    owner: "Experience",
    impact: 78,
    speed: 81,
    detail: "Mostly rendering work with a small API contract change.",
    accent: "bg-emerald-500",
  },
  {
    id: "invite",
    title: "Tighten invite flow",
    owner: "Growth",
    impact: 64,
    speed: 88,
    detail: "Short implementation, high confidence, strong conversion upside.",
    accent: "bg-fuchsia-500",
  },
  {
    id: "search",
    title: "Search result polish",
    owner: "Core",
    impact: 86,
    speed: 58,
    detail:
      "Ranking is stable; the remaining work is layout and interaction cleanup.",
    accent: "bg-amber-500",
  },
] as const;

export const ComplexLayoutAnimation = () => {
  const [sortBy, setSortBy] = createSignal<"impact" | "speed">("impact");
  const [expandedId, setExpandedId] = createSignal<string | null>("sync");

  const sortedQueue = createMemo(() => {
    const metric = sortBy();

    return [...queue].sort((a, b) => b[metric] - a[metric]);
  });

  return (
    <Animation
      name="Reshuffling List Layout Animation"
      class="min-h-[480px]"
      wrapperClass="w-full p-4"
      source={source}
    >
      <div class="flex w-full flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-foreground">Prioritized queue</p>
            <p class="text-xs text-muted-foreground">
              Re-sort the list and expand any item to change its internal size.
            </p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-xl border border-border px-3 py-2 text-sm font-medium"
              classList={{
                "bg-muted text-foreground": sortBy() === "impact",
              }}
              onClick={() => setSortBy("impact")}
            >
              Sort by impact
            </button>
            <button
              type="button"
              class="rounded-xl border border-border px-3 py-2 text-sm font-medium"
              classList={{
                "bg-muted text-foreground": sortBy() === "speed",
              }}
              onClick={() => setSortBy("speed")}
            >
              Sort by speed
            </button>
          </div>
        </div>

        <motion.div
          layout
          class="flex flex-col gap-3"
          data-motion-debug-id="reshuffle-list"
        >
          <For each={sortedQueue()}>
            {(item) => {
              const isExpanded = () => expandedId() === item.id;
              const currentValue = () => item[sortBy()];

              return (
                <motion.button
                  layout
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  type="button"
                  data-motion-debug-id={`reshuffle-row-${item.id}`}
                  class="border border-border bg-card p-4 text-left"
                  style={{
                    "border-radius": "24px",
                    "box-shadow": "0 12px 28px rgba(15, 23, 42, 0.08)",
                  }}
                  onClick={() =>
                    setExpandedId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                >
                  <motion.div
                    layout="position"
                    class="flex items-start justify-between gap-4"
                    data-motion-debug-id={`reshuffle-header-row-${item.id}`}
                  >
                    <motion.div
                      layout="position"
                      data-motion-debug-id={`reshuffle-header-${item.id}`}
                    >
                      <p class="text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p class="mt-1 text-xs text-muted-foreground">
                        {item.owner}
                      </p>
                    </motion.div>
                    <motion.div
                      layout="position"
                      class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                      data-motion-debug-id={`reshuffle-pill-${item.id}`}
                    >
                      {sortBy() === "impact" ? "Impact" : "Speed"}{" "}
                      {currentValue()}
                    </motion.div>
                  </motion.div>

                  <motion.div
                    layout
                    class="mt-4 h-2 bg-muted"
                    data-motion-debug-id={`reshuffle-progress-track-${item.id}`}
                    style={{ "border-radius": "999px" }}
                  >
                    <motion.div
                      layout
                      class={`h-full ${item.accent}`}
                      data-motion-debug-id={`reshuffle-progress-fill-${item.id}`}
                      style={{
                        width: `${currentValue()}%`,
                        "border-radius": "999px",
                      }}
                    />
                  </motion.div>

                  <AnimatePresence initial={false}>
                    <Show when={isExpanded()}>
                      <motion.div
                        layout
                        data-motion-debug-id={`reshuffle-detail-${item.id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18 }}
                        class="mt-4 bg-muted p-3"
                        style={{ "border-radius": "20px" }}
                      >
                        <motion.p
                          layout="position"
                          class="text-sm leading-6 text-muted-foreground"
                        >
                          {item.detail}
                        </motion.p>
                        <motion.div
                          layout="position"
                          class="mt-3 flex gap-3 text-xs text-muted-foreground"
                        >
                          <span>Impact: {item.impact}</span>
                          <span>Speed: {item.speed}</span>
                        </motion.div>
                      </motion.div>
                    </Show>
                  </AnimatePresence>
                </motion.button>
              );
            }}
          </For>
        </motion.div>
      </div>
    </Animation>
  );
};
