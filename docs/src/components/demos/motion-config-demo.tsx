import { createSignal } from "solid-js";
import { MotionConfig, motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./motion-config-demo.tsx?raw";

export const MotionConfigDemo = () => {
  const [active, setActive] = createSignal(false);

  return (
    <Animation
      name="MotionConfig"
      class="min-h-[240px]"
      wrapperClass="w-full p-4"
      source={source}
    >
      <MotionConfig
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
      >
        <div class="w-full">
          <button
            type="button"
            class="rounded-xl border border-border px-3 py-2 text-sm font-medium"
            onClick={() => setActive((value) => !value)}
          >
            Toggle
          </button>

          <div class="relative mt-4 h-28 overflow-hidden rounded-[28px] border border-border bg-muted">
            <motion.div
              animate={{
                x: active() ? 208 : 0,
                rotate: active() ? 45 : 0,
              }}
              class="absolute left-3 top-3 size-16 bg-primary"
              style={{ "border-radius": "20px" }}
            />
            <motion.div
              animate={{
                x: active() ? 120 : 0,
                scale: active() ? 1.08 : 1,
              }}
              class="absolute bottom-4 left-3 h-12 w-28 border border-border bg-card"
              style={{ "border-radius": "999px" }}
            />
          </div>
        </div>
      </MotionConfig>
    </Animation>
  );
};
