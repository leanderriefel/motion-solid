import { AnimatePresence, motion } from "motion-solid";
import { createSignal, Show } from "solid-js";
import { Animation } from "~/components/animation";
import source from "./exit-animation.tsx?raw";

export const ExitAnimation = () => {
  const [isVisible, setIsVisible] = createSignal(true);

  return (
    <Animation name="Exit Animation" class="h-[300px]" source={source}>
      <div class="flex flex-col items-center gap-8">
        <div class="h-24 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            <Show when={isVisible()}>
              <motion.div
                class="size-24 rounded-2xl bg-primary shadow-lg"
                exit={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                initial={{ opacity: 0, scale: 0 }}
                transition={{
                  duration: 0.5,
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  bounce: 0.5,
                }}
              />
            </Show>
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          class="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-sm transition-colors hover:bg-primary/90"
          onClick={() => setIsVisible((v) => !v)}
        >
          <Show when={isVisible()} fallback="Show">
            Hide
          </Show>
        </motion.button>
      </div>
    </Animation>
  );
};
