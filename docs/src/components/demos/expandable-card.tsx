import { createSignal, Show } from "solid-js";
import { motion, AnimatePresence } from "motion-solid";

import { Animation } from "./animation";
import { source } from "./expandable-card.source";

export const ExpandableCard = () => {
  const [selectedId, setSelectedId] = createSignal<string | null>(null);

  const items = [
    {
      id: "1",
      title: "The SolidJS Experience",
      subtitle: "Reactive by nature",
      color: "bg-blue-500",
    },
    {
      id: "2",
      title: "Motion Solid",
      subtitle: "Fluid animations",
      color: "bg-purple-500",
    },
    {
      id: "3",
      title: "High Performance",
      subtitle: "Zero overhead",
      color: "bg-emerald-500",
    },
    {
      id: "4",
      title: "Beautiful UI",
      subtitle: "Made easy",
      color: "bg-orange-500",
    },
  ];

  return (
    <Animation name="Expandable Card" source={source}>
      <div class="relative w-full h-[500px] bg-slate-100 rounded-3xl p-8 overflow-hidden flex flex-wrap gap-6 justify-center content-start">
        {items.map((item) => (
          <motion.div
            layoutId={`card-${item.id}`}
            onClick={() => setSelectedId(item.id)}
            class={`w-[200px] h-[250px] ${item.color} rounded-2xl cursor-pointer p-6 shadow-md hover:shadow-xl transition-shadow flex flex-col justify-end text-white relative overflow-hidden`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.h2
              layoutId={`title-${item.id}`}
              class="text-xl font-bold m-0 z-10 relative"
            >
              {item.title}
            </motion.h2>
            <motion.p
              layoutId={`subtitle-${item.id}`}
              class="text-white/80 text-sm m-0 mt-1 z-10 relative"
            >
              {item.subtitle}
            </motion.p>
            {/* Background pattern */}
            <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
          </motion.div>
        ))}

        <AnimatePresence>
          <Show when={selectedId()}>
            {(id) => {
              const selectedItem = items.find((i) => i.id === id());
              return (
                <div class="absolute inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedId(null)}
                    class="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                  />

                  {/* Expanded Card */}
                  <motion.div
                    layoutId={`card-${id()}`}
                    class={`w-full max-w-lg ${selectedItem?.color} rounded-3xl shadow-2xl overflow-hidden relative pointer-events-auto flex flex-col`}
                    style={{ height: "450px" }}
                  >
                    <div class="p-8 pb-4 relative z-10">
                      <motion.h2
                        layoutId={`title-${id()}`}
                        class="text-3xl font-bold text-white m-0"
                      >
                        {selectedItem?.title}
                      </motion.h2>
                      <motion.p
                        layoutId={`subtitle-${id()}`}
                        class="text-white/80 text-lg m-0 mt-2"
                      >
                        {selectedItem?.subtitle}
                      </motion.p>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                      exit={{
                        opacity: 0,
                        y: 20,
                        transition: { duration: 0.2 },
                      }}
                      class="flex-1 p-8 pt-4 text-white/90 z-10 relative leading-relaxed"
                    >
                      <p>
                        This is an example of a shared layout animation. By
                        giving two separate components the same{" "}
                        <code>layoutId</code>, Motion automatically animates the
                        transition between them when one mounts and the other
                        unmounts.
                      </p>
                      <p class="mt-4">
                        The background color, border radius, and position all
                        smoothly interpolate. Notice how the text also
                        seamlessly glides into its new position!
                      </p>
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
                      class="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white z-20 backdrop-blur-md"
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

                    <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none"></div>
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
