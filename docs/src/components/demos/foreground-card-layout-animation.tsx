import { For, Show, createMemo, createSignal } from "solid-js";
import { AnimatePresence, LayoutGroup, motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./foreground-card-layout-animation.tsx?raw";

type DemoCard = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  color: string;
};

const cards: readonly DemoCard[] = [
  {
    id: "alpha",
    title: "Release notes",
    summary: "Short summary text next to a square.",
    detail:
      "The square, title, and summary all move into the modal instead of being replaced by a new layout.",
    color: "#2563eb",
  },
  {
    id: "beta",
    title: "Migration prep",
    summary: "Another plain row in the list.",
    detail:
      "This keeps the example focused on shared layout motion with three simple stacked entries and a modal target.",
    color: "#ea580c",
  },
  {
    id: "gamma",
    title: "Support handoff",
    summary: "Minimal text with a bold title.",
    detail:
      "Opening and closing the modal reuses the same square and text blocks so the position changes stay readable.",
    color: "#059669",
  },
] as const;

const partId = (id: string, part: string) => `${id}-${part}`;

const sharedCardShellStyle = {
  position: "relative",
  overflow: "hidden",
  "border-radius": "24px",
  "box-shadow": "0 14px 34px rgba(15, 23, 42, 0.08)",
} as const;

export const ForegroundCardLayoutAnimation = () => {
  const [selectedId, setSelectedId] = createSignal<string | null>(null);

  const selectedCard = createMemo(
    () => cards.find((card) => card.id === selectedId()) ?? null,
  );

  return (
    <Animation
      name="Foreground Card Layout"
      class="min-h-[720px]"
      wrapperClass="w-full p-4"
      source={source}
    >
      <LayoutGroup id="simple-foreground-card-demo">
        <div class="relative w-full">
          <div>
            <p class="text-sm font-semibold text-foreground">
              Three stacked rows
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              Click a row to animate the same square and text into a modal.
            </p>
          </div>

          <motion.div layout class="mt-4 flex flex-col gap-3">
            <For each={cards}>
              {(card) => {
                const isSelected = () => selectedId() === card.id;

                return (
                  <button
                    type="button"
                    class="block w-full bg-transparent p-0 text-left"
                    style={{
                      border: "none",
                      "pointer-events": isSelected() ? "none" : "auto",
                    }}
                    onClick={() => setSelectedId(card.id)}
                  >
                    <motion.div
                      layout
                      layoutId={partId(card.id, "card")}
                      layoutDependency={selectedId()}
                      layoutCrossfade={false}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                      }}
                      class="border border-border bg-card p-4 text-left transition-colors hover:border-foreground/20"
                      style={sharedCardShellStyle}
                    >
                      <div class="flex items-start gap-4">
                        <motion.div
                          layoutId={partId(card.id, "square")}
                          layoutCrossfade={false}
                          class="size-14 shrink-0"
                          style={{
                            background: card.color,
                            "border-radius": "18px",
                          }}
                        />

                        <motion.div
                          layoutId={partId(card.id, "text")}
                          layout="position"
                          layoutCrossfade={false}
                          class="min-w-0"
                        >
                          <p class="text-base font-semibold text-foreground">
                            {card.title}
                          </p>
                          <p class="mt-1 text-sm leading-6 text-muted-foreground">
                            {card.summary}
                          </p>
                        </motion.div>
                      </div>
                    </motion.div>
                  </button>
                );
              }}
            </For>
          </motion.div>

          <AnimatePresence initial={false} mode="sync">
            <Show when={selectedCard()} keyed>
              {(card) => (
                <div class="absolute inset-0 z-20">
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    type="button"
                    class="absolute inset-0 bg-black/30"
                    onClick={() => setSelectedId(null)}
                    aria-label="Close modal"
                  />

                  <div class="absolute inset-3 flex items-center justify-center md:inset-6">
                    <div
                      class="w-full max-w-2xl"
                      style={{
                        filter:
                          "drop-shadow(0 30px 90px rgba(15, 23, 42, 0.22))",
                      }}
                    >
                      <motion.div
                        layoutId={partId(card.id, "card")}
                        layoutDependency={selectedId()}
                        layoutCrossfade={false}
                        class="w-full border border-border bg-card p-5 md:p-6"
                        style={sharedCardShellStyle}
                      >
                        <div class="flex items-start justify-between gap-4">
                          <div class="flex min-w-0 items-start gap-4">
                            <motion.div
                              layoutId={partId(card.id, "square")}
                              layoutCrossfade={false}
                              class="size-24 shrink-0"
                              style={{
                                background: card.color,
                                "border-radius": "24px",
                              }}
                            />

                            <motion.div
                              layoutId={partId(card.id, "text")}
                              layout="position"
                              layoutCrossfade={false}
                              class="min-w-0"
                            >
                              <p class="text-base font-semibold text-foreground">
                                {card.title}
                              </p>
                              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                                {card.summary}
                              </p>
                            </motion.div>
                          </div>

                          <button
                            type="button"
                            class="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground"
                            onClick={() => setSelectedId(null)}
                          >
                            Close
                          </button>
                        </div>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2, delay: 0.05 }}
                          class="mt-6"
                        >
                          <p class="text-sm leading-7 text-foreground">
                            {card.detail}
                          </p>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              )}
            </Show>
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </Animation>
  );
};
