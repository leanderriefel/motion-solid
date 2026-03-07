import { For, createSignal } from "solid-js";
import { motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./gesture-animation.tsx?raw";

const dragModes = [
  {
    id: true,
    label: "Free",
    description: "Drag on both axes.",
  },
  {
    id: "x",
    label: "X Axis",
    description: "Lock movement horizontally.",
  },
  {
    id: "y",
    label: "Y Axis",
    description: "Lock movement vertically.",
  },
  {
    id: false,
    label: "Locked",
    description: "Disable dragging.",
  },
] as const;

export const GestureAnimation = () => {
  const [dragMode, setDragMode] =
    createSignal<(typeof dragModes)[number]["id"]>(true);

  const activeMode = () => dragModes.find((mode) => mode.id === dragMode());

  return (
    <Animation
      name="Gesture Animation"
      class="min-h-[420px]"
      wrapperClass="w-full p-4"
      source={source}
    >
      <div class="w-full">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-foreground">Drag playground</p>
            <p class="mt-1 text-xs text-muted-foreground">
              Switch between free drag, axis locks, and a fully locked square.
            </p>
          </div>
          <motion.div
            layout
            class="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground shadow-sm"
          >
            {activeMode()?.label}
          </motion.div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <For each={dragModes}>
            {(mode) => (
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 360, damping: 26 }}
                type="button"
                class="rounded-2xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm"
                classList={{
                  "border-slate-900 bg-slate-900 text-white":
                    dragMode() === mode.id,
                }}
                onClick={() => setDragMode(mode.id)}
              >
                {mode.label}
              </motion.button>
            )}
          </For>
        </div>

        <div class="relative mt-4 flex h-[280px] items-center justify-center overflow-hidden rounded-[30px] border border-border bg-[radial-gradient(circle_at_center,#ffffff_0%,#f8fafc_58%,#e2e8f0_100%)]">
          <div class="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div class="absolute inset-x-6 top-1/2 h-px -translate-y-px bg-slate-300/60" />
          <div class="absolute inset-y-6 left-1/2 w-px -translate-x-px bg-slate-300/60" />

          <motion.div
            drag={dragMode()}
            dragConstraints={{ top: -92, right: 124, bottom: 92, left: -124 }}
            dragElastic={0.08}
            dragMomentum={false}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            class="relative z-10 size-20 rounded-[24px] bg-[linear-gradient(145deg,#0f172a_0%,#2563eb_55%,#38bdf8_100%)] shadow-[0_24px_60px_-28px_rgba(37,99,235,0.55)]"
          />
        </div>

        <motion.p layout class="mt-4 text-sm leading-6 text-muted-foreground">
          {activeMode()?.description}
        </motion.p>
      </div>
    </Animation>
  );
};
