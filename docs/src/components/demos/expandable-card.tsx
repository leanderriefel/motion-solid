import { createSignal, For, Show } from "solid-js";
import { motion, AnimatePresence } from "motion-solid";

import { Animation } from "./animation";
import source from "./expandable-card.tsx?raw";

export const ExpandableCard = () => {
  const [selectedId, setSelectedId] = createSignal<string | null>(null);

  const items = [
    {
      id: "1",
      title: "The SolidJS Experience",
      subtitle: "Reactive by nature",
      color: "bg-primary text-primary-foreground",
    },
    {
      id: "2",
      title: "Motion Solid",
      subtitle: "Fluid animations",
      color: "bg-secondary text-secondary-foreground",
    },
    {
      id: "3",
      title: "High Performance",
      subtitle: "Zero overhead",
      color: "bg-accent text-accent-foreground",
    },
    {
      id: "4",
      title: "Beautiful UI",
      subtitle: "Made easy",
      color: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <Animation
      name="Expandable Card"
      source={source}
      class="min-h-[500px] w-full"
    >
      <div class="w-full flex flex-wrap gap-4 justify-center content-start p-4">
        {items.map((item) => (
          <motion.div
            layoutId={`card-${item.id}`}
            layout
            onClick={() => setSelectedId(item.id)}
            class={`w-[180px] h-[200px] ${item.color} rounded-2xl cursor-pointer p-5 shadow-md hover:shadow-xl transition-shadow flex flex-col justify-end relative overflow-hidden`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              layoutId={`title-${item.id}`}
              layout="position"
              class="text-lg font-bold m-0 z-10 relative"
            >
              {item.title}
            </motion.div>
            <motion.div
              layoutId={`subtitle-${item.id}`}
              layout="position"
              class="opacity-80 text-xs m-0 mt-1 z-10 relative"
            >
              {item.subtitle}
            </motion.div>
          </motion.div>
        ))}

        <AnimatePresence>
          <Show when={selectedId()}>
            {(id) => {
              const selectedItem = items.find((i) => i.id === id());
              return (
                <div class="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedId(null)}
                    class="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
                  />

                  <motion.div
                    layoutId={`card-${id()}`}
                    layout
                    class={`w-full max-w-sm ${selectedItem?.color} rounded-3xl shadow-2xl overflow-hidden relative pointer-events-auto flex flex-col`}
                    style={{ height: "450px" }}
                  >
                    <div class="p-8 pb-4 relative z-10">
                      <motion.div
                        layoutId={`title-${id()}`}
                        layout="position"
                        class="text-3xl font-bold m-0"
                      >
                        {selectedItem?.title}
                      </motion.div>
                      <motion.div
                        layoutId={`subtitle-${id()}`}
                        layout="position"
                        class="opacity-80 text-lg m-0 mt-2"
                      >
                        {selectedItem?.subtitle}
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                      exit={{
                        opacity: 0,
                        y: 20,
                        transition: { duration: 0.2 },
                      }}
                      class="flex-1 px-8 pt-4 pb-8 z-10 relative leading-relaxed overflow-y-auto opacity-90"
                    >
                      <div>
                        This is an example of a shared layout animation. By
                        giving two separate components the same{" "}
                        <code>layoutId</code>, Motion automatically animates the
                        transition between them when one mounts and the other
                        unmounts.
                      </div>
                      <div class="mt-4">
                        The background color, border radius, and position all
                        smoothly interpolate. Notice how the text also
                        seamlessly glides into its new position!
                      </div>
                    </motion.div>

                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        transition: { delay: 0.2 },
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.8,
                        transition: { duration: 0.1 },
                      }}
                      onClick={() => setSelectedId(null)}
                      class="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center z-20 backdrop-blur-md transition-colors"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 1L13 13M1 13L13 1"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                        />
                      </svg>
                    </motion.button>
                  </motion.div>
                </div>
              );
            }}
          </Show>
        </AnimatePresence>
      </div>
    </Animation>
  );
};
