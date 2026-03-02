import { createSignal, For, Show } from "solid-js";
import { motion, AnimatePresence } from "motion-solid";

import { Animation } from "./animation";
import { source } from "./filterable-grid.source";

export const FilterableGrid = () => {
  const allItems = [
    { id: "A", category: "work", color: "bg-blue-400" },
    { id: "B", category: "play", color: "bg-pink-400" },
    { id: "C", category: "work", color: "bg-indigo-400" },
    { id: "D", category: "study", color: "bg-emerald-400" },
    { id: "E", category: "play", color: "bg-orange-400" },
    { id: "F", category: "study", color: "bg-teal-400" },
  ];

  const categories = ["all", "work", "play", "study"];
  const [filter, setFilter] = createSignal("all");

  const filteredItems = () =>
    filter() === "all"
      ? allItems
      : allItems.filter((item) => item.category === filter());

  return (
    <Animation name="Filterable Grid" source={source}>
      <div class="w-full h-[500px] flex flex-col bg-slate-50 p-6 rounded-2xl relative shadow-inner overflow-hidden">
        <div class="flex space-x-2 mb-8 justify-center z-20">
          <For each={categories}>
            {(category) => (
              <button
                class={`px-4 py-2 rounded-full font-medium text-sm transition-colors relative ${
                  filter() === category
                    ? "text-white"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() => setFilter(category)}
              >
                <Show when={filter() === category}>
                  <motion.div
                    layoutId="active-pill"
                    class="absolute inset-0 bg-slate-900 rounded-full z-0"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </Show>
                <span class="relative z-10 capitalize">{category}</span>
              </button>
            )}
          </For>
        </div>

        <div class="flex-1 w-full max-w-lg mx-auto relative overflow-y-auto overflow-x-hidden p-4">
          <motion.div layout class="grid grid-cols-2 gap-4">
            <AnimatePresence>
              <For each={filteredItems()}>
                {(item) => (
                  <motion.div
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    class={`h-32 ${item.color} rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-sm`}
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
