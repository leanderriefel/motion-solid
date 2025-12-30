import { Show } from "solid-js";
import { createSignal } from "solid-js";
import { motion } from "motion-solid";
import { AnimatePresence } from "motion-solid";
import { Animation } from "./animation";
import source from "./animating-layout-bar.tsx?raw";
import { AiFillSignal, AiOutlineWifi } from "solid-icons/ai";
import { FaSolidX } from "solid-icons/fa";

export const AnimatingLayoutBar = () => {
  const [extended, setExtended] = createSignal(false);

  return (
    <Animation name="Animating Layout Bar" source={source}>
      <motion.div
        layout
        layoutDependencies={[extended]}
        class="flex justify-end items-center h-10 px-4 bg-foreground/10"
        onClick={() => setExtended((prev) => !prev)}
        style={{
          "border-radius": "16px",
        }}
      >
        <AnimatePresence>
          <Show when={extended()}>
            <motion.div
              initial={{ width: 0, opacity: 0, "margin-right": 0 }}
              animate={{ width: "auto", opacity: 1, "margin-right": 8 }}
              exit={{ width: 0, opacity: 0, "margin-right": 0 }}
              class="overflow-hidden"
            >
              <FaSolidX class="size-5" />
            </motion.div>
          </Show>
        </AnimatePresence>
        <motion.div layout="position" class="flex items-center gap-x-2">
          <button>
            <AiOutlineWifi class="size-6" />
          </button>
          <button>
            <AiFillSignal class="size-6" />
          </button>
        </motion.div>
      </motion.div>
    </Animation>
  );
};
