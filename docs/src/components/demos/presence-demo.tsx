import { AnimatePresence, motion } from "motion-solid";
import { Show, createSignal } from "solid-js";
import { Animation } from "./animation";
import source from "./presence-demo.tsx?raw";

export const PresenceDemo = () => {
  const [visible, setVisible] = createSignal(true);

  return (
    <Animation
      name="AnimatePresence"
      class="min-h-[260px]"
      wrapperClass="w-full p-4"
      source={source}
    >
      <div class="flex w-full flex-col items-center gap-6">
        <div class="flex h-24 items-center justify-center">
          <AnimatePresence>
            <Show when={visible()}>
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.2 }}
                class="size-20 rounded-[24px] bg-primary shadow-lg"
              />
            </Show>
          </AnimatePresence>
        </div>

        <button
          type="button"
          class="rounded-xl border border-border px-3 py-2 text-sm font-medium"
          onClick={() => setVisible((value) => !value)}
        >
          Toggle
        </button>
      </div>
    </Animation>
  );
};
