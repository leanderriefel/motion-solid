import { For, createSignal } from "solid-js";
import { motion, type Variants } from "motion-solid";
import { Animation } from "./animation";
import source from "./variants-demo.tsx?raw";

const accents = ["#2563eb", "#16a34a", "#ea580c"] as const;

const stack: Variants = {
  closed: {
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
  open: {
    transition: {
      delayChildren: 0.05,
      staggerChildren: 0.06,
    },
  },
};

const item: Variants = {
  closed: {
    opacity: 0.35,
    y: 10,
    scale: 0.94,
  },
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
};

export const VariantsDemo = () => {
  const [open, setOpen] = createSignal(false);

  return (
    <Animation
      name="Variants"
      class="min-h-[260px]"
      wrapperClass="w-full p-4"
      source={source}
    >
      <div class="w-full">
        <button
          type="button"
          class="rounded-xl border border-border px-3 py-2 text-sm font-medium"
          onClick={() => setOpen((value) => !value)}
        >
          Toggle
        </button>

        <motion.div
          variants={stack}
          initial={false}
          animate={open() ? "open" : "closed"}
          class="mt-4 flex gap-3"
        >
          <For each={accents}>
            {(accent) => (
              <motion.div
                variants={item}
                class="h-20 flex-1 rounded-[20px]"
                style={{
                  background: accent,
                  "border-radius": "20px",
                }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 26,
                }}
              />
            )}
          </For>
        </motion.div>
      </div>
    </Animation>
  );
};
