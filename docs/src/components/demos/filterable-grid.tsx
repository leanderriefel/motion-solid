import { createSignal, For, Show } from "solid-js";
import { motion, AnimatePresence } from "motion-solid";

import { Animation } from "./animation";
import source from "./filterable-grid.tsx?raw";

export const FilterableGrid = () => {
  const allItems = [
    { id: "A", category: "work", color: "bg-primary text-primary-foreground" },
    {
      id: "B",
      category: "play",
      color: "bg-secondary text-secondary-foreground",
    },
    { id: "C", category: "work", color: "bg-primary text-primary-foreground" },
    { id: "D", category: "study", color: "bg-accent text-accent-foreground" },
    {
      id: "E",
      category: "play",
      color: "bg-secondary text-secondary-foreground",
    },
    { id: "F", category: "study", color: "bg-accent text-accent-foreground" },
  ];

  const categories = ["all", "work", "play", "study"];
  const [filter, setFilter] = createSignal("all");

  const filteredItems = () =>
    filter() === "all"
      ? allItems
      : allItems.filter((item) => item.category === filter());

  return (
    <Animation
      name="Filterable Grid"
      source={source}
      class="min-h-[400px] w-full p-4"
    >
      <div class="w-full flex flex-col relative h-full">
        <div class="flex flex-wrap gap-2 mb-8 justify-center z-20">
          <For each={categories}>
            {(category) => (
              <button
                class={`px-4 py-2 rounded-full font-medium text-sm transition-colors relative ${
                  filter() === category
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setFilter(category)}
              >
                <Show when={filter() === category}>
                  <motion.div
                    layoutId="active-pill"
                    class="absolute inset-0 bg-primary rounded-full z-0"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </Show>
                <span class="relative z-10 capitalize">{category}</span>
              </button>
            )}
          </For>
        </div>

        <div class="flex-1 w-full max-w-lg mx-auto">
          <motion.div
            layout
            layoutDependency={filter}
            class="grid grid-cols-2 gap-4"
          >
            <AnimatePresence mode="popLayout">
              <For each={filteredItems()}>
                {(item) => (
                  <motion.div
                    layout
                    layoutDependency={filter}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    class={`h-24 ${item.color} rounded-2xl flex items-center justify-center text-3xl font-bold shadow-sm`}
                  >
                    {item.id}
                  </motion.div>
                )}
              </For>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </Animation>
  );
};
