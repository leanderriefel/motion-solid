import { For, Show, createMemo, createSignal } from "solid-js";
import { AnimatePresence, motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./complex-layout-board.tsx?raw";

type BoardLane = "backlog" | "in-progress" | "review";

type BoardCard = {
  id: string;
  title: string;
  lane: BoardLane;
  tall: boolean;
};

const initialCards: BoardCard[] = [
  { id: "card-1", title: "Sync layout tree", lane: "backlog", tall: false },
  { id: "card-2", title: "Race-proof exits", lane: "in-progress", tall: true },
  {
    id: "card-3",
    title: "Scroll container fixes",
    lane: "review",
    tall: false,
  },
  {
    id: "card-4",
    title: "Nested presence handoff",
    lane: "backlog",
    tall: true,
  },
  {
    id: "card-5",
    title: "Projection perf pass",
    lane: "in-progress",
    tall: false,
  },
  { id: "card-6", title: "Shared-id stress test", lane: "review", tall: false },
];

const laneOrder: BoardLane[] = ["backlog", "in-progress", "review"];

const nextLane = (lane: BoardLane): BoardLane => {
  const currentIndex = laneOrder.indexOf(lane);
  const nextIndex = (currentIndex + 1) % laneOrder.length;
  return laneOrder[nextIndex]!;
};

const shuffleCards = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [next[i], next[swapIndex]] = [next[swapIndex]!, next[i]!];
  }
  return next;
};

export const ComplexLayoutBoard = () => {
  const [cards, setCards] = createSignal(initialCards);
  const [activeId, setActiveId] = createSignal(initialCards[0]!.id);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);

  const activeCard = createMemo(() =>
    cards().find((card) => card.id === activeId()),
  );

  const addCard = () => {
    setCards((prev) => {
      const nextIndex = prev.length + 1;
      return [
        ...prev,
        {
          id: `card-${nextIndex}`,
          title: `New sequence ${nextIndex}`,
          lane: laneOrder[nextIndex % laneOrder.length]!,
          tall: nextIndex % 2 === 0,
        },
      ];
    });
  };

  const removeCard = () => {
    setCards((prev) => {
      if (prev.length <= 3) return prev;
      const next = prev.slice(0, -1);
      const currentActive = activeId();
      if (!next.some((card) => card.id === currentActive)) {
        setActiveId(next[0]!.id);
        setExpandedId(null);
      }
      return next;
    });
  };

  const cycleCardLane = (id: string) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === id
          ? { ...card, lane: nextLane(card.lane), tall: !card.tall }
          : card,
      ),
    );
  };

  const selectCard = (id: string) => {
    setActiveId(id);
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <Animation name="Complex Layout Board" source={source} scrollable>
      <div class="w-full space-y-3 pt-3">
        <motion.div layout class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            onClick={() => setCards((prev) => shuffleCards(prev))}
          >
            Shuffle
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            onClick={addCard}
          >
            Add card
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            onClick={removeCard}
          >
            Remove card
          </button>
        </motion.div>

        <motion.div
          layout
          layoutDependencies={[cards, expandedId, activeId]}
          class="grid grid-cols-1 gap-2 sm:grid-cols-2"
          transition={{
            layout: { type: "spring", stiffness: 380, damping: 34 },
          }}
        >
          <For each={cards()}>
            {(card) => (
              <motion.article
                layout
                class="rounded-xl border bg-foreground/5 p-3"
                style={{
                  "min-height": card.tall ? "170px" : "110px",
                }}
                transition={{
                  layout: { type: "spring", stiffness: 400, damping: 32 },
                }}
                onClick={() => selectCard(card.id)}
              >
                <motion.div
                  layout="position"
                  class="flex items-center justify-between"
                >
                  <p class="text-sm font-medium">{card.title}</p>
                  <Show when={activeId() === card.id}>
                    <motion.span
                      layoutId="complex-board-active-indicator"
                      class="size-2 rounded-full bg-primary"
                    />
                  </Show>
                </motion.div>

                <motion.p
                  layout="position"
                  class="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground"
                >
                  {card.lane}
                </motion.p>

                <motion.div layout="position" class="mt-2 flex gap-2">
                  <button
                    type="button"
                    class="rounded-md border px-2 py-1 text-[11px]"
                    onClick={(event) => {
                      event.stopPropagation();
                      cycleCardLane(card.id);
                    }}
                  >
                    Move lane
                  </button>
                  <button
                    type="button"
                    class="rounded-md border px-2 py-1 text-[11px]"
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedId((current) =>
                        current === card.id ? null : card.id,
                      );
                    }}
                  >
                    Details
                  </button>
                </motion.div>

                <AnimatePresence mode="popLayout">
                  <Show when={expandedId() === card.id}>
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      class="mt-2 overflow-hidden rounded-md border border-border/60 bg-background/80 p-2 text-xs text-muted-foreground"
                    >
                      This card animates with grid reflow, nested presence, and
                      lane transitions.
                    </motion.div>
                  </Show>
                </AnimatePresence>
              </motion.article>
            )}
          </For>
        </motion.div>

        <AnimatePresence mode="wait">
          <Show when={activeCard()} keyed>
            {(card) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                class="rounded-xl border bg-foreground/5 p-3"
              >
                <motion.p
                  layout="position"
                  class="text-xs text-muted-foreground"
                >
                  Active card
                </motion.p>
                <motion.p layout="position" class="mt-1 text-sm font-medium">
                  {card.title}
                </motion.p>
                <motion.p layout="position" class="mt-1 text-xs">
                  Lane: {card.lane} · Height mode:{" "}
                  {card.tall ? "tall" : "compact"}
                </motion.p>
              </motion.div>
            )}
          </Show>
        </AnimatePresence>
      </div>
    </Animation>
  );
};
