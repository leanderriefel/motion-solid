import { For, createMemo, createSignal } from "solid-js";
import { AnimatePresence, motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./layout-scroll-sticky.tsx?raw";

type FeedItem = {
  id: string;
  title: string;
  priority: number;
};

const initialItems: FeedItem[] = [
  { id: "feed-1", title: "Measure layout root", priority: 1 },
  { id: "feed-2", title: "Animate shared indicator", priority: 2 },
  { id: "feed-3", title: "Resolve transform drift", priority: 3 },
  { id: "feed-4", title: "Keep exits smooth", priority: 4 },
  { id: "feed-5", title: "Verify scroll offsets", priority: 5 },
  { id: "feed-6", title: "Batch projection writes", priority: 6 },
];

const shuffleItems = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [next[i], next[swapIndex]] = [next[swapIndex]!, next[i]!];
  }
  return next;
};

export const LayoutScrollSticky = () => {
  const [items, setItems] = createSignal(initialItems);
  const [pinnedIds, setPinnedIds] = createSignal<string[]>([
    "feed-1",
    "feed-3",
  ]);

  const pinnedItems = createMemo(() => {
    const pinned = new Set(pinnedIds());
    return items().filter((item) => pinned.has(item.id));
  });

  const feedItems = createMemo(() => {
    const pinned = new Set(pinnedIds());
    return items().filter((item) => !pinned.has(item.id));
  });

  const togglePinned = (id: string) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  return (
    <Animation name="Scroll + Sticky Layout" source={source} scrollable>
      <div class="w-full space-y-3 pt-3">
        <motion.div layout class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            onClick={() => setItems((prev) => shuffleItems(prev))}
          >
            Shuffle feed
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            onClick={() =>
              setItems((prev) =>
                prev.map((item) => ({
                  ...item,
                  priority: Math.max(
                    1,
                    Math.min(9, item.priority + (Math.random() > 0.5 ? 1 : -1)),
                  ),
                })),
              )
            }
          >
            Shift priorities
          </button>
        </motion.div>

        <motion.div
          layout
          layoutDependencies={[items, pinnedIds]}
          layoutScroll
          class="h-[380px] overflow-y-auto rounded-xl border bg-foreground/5"
        >
          <motion.div class="sticky top-0 z-10 border-b bg-background/95 p-2 backdrop-blur">
            <motion.p layout="position" class="text-xs font-medium">
              Pinned queue (click any card to move it)
            </motion.p>

            <motion.div layout class="mt-2 flex flex-wrap gap-2">
              <AnimatePresence mode="popLayout">
                <For each={pinnedItems()}>
                  {(item) => (
                    <motion.button
                      type="button"
                      layout
                      layoutId={`scroll-feed-item-${item.id}`}
                      class="rounded-md border bg-background px-2 py-1 text-xs"
                      onClick={() => togglePinned(item.id)}
                      transition={{
                        layout: { type: "spring", stiffness: 420, damping: 32 },
                      }}
                    >
                      {item.title}
                    </motion.button>
                  )}
                </For>
              </AnimatePresence>
            </motion.div>
          </motion.div>

          <motion.div layout class="space-y-2 p-3">
            <AnimatePresence mode="popLayout">
              <For each={feedItems()}>
                {(item) => (
                  <motion.button
                    type="button"
                    layout
                    layoutId={`scroll-feed-item-${item.id}`}
                    class="w-full rounded-xl border bg-background px-3 py-2 text-left"
                    onClick={() => togglePinned(item.id)}
                    transition={{
                      layout: { type: "spring", stiffness: 420, damping: 34 },
                    }}
                  >
                    <motion.p layout="position" class="text-sm font-medium">
                      {item.title}
                    </motion.p>
                    <motion.p
                      layout="position"
                      class="mt-1 text-xs text-muted-foreground"
                    >
                      Priority {item.priority} · tap to pin in sticky zone
                    </motion.p>
                  </motion.button>
                )}
              </For>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </Animation>
  );
};
