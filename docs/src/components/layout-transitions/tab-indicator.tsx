import { createSignal, For, Show } from "solid-js";
import { motion } from "motion-solid";
import source from "./tab-indicator.tsx?raw";
import { Animation } from "../demos/animation";

const tabs = ["Home", "About", "Contact"];

export const TabIndicator = () => {
  const [active, setActive] = createSignal(0);

  return (
    <Animation name="Tab Indicator" source={source}>
      <div class="w-full max-w-xs">
        <motion.div
          layout
          layoutDependencies={[active]}
          class="relative flex rounded-lg border border-border bg-card p-1"
        >
          <For each={tabs}>
            {(tab, index) => (
              <button
                type="button"
                class="relative flex-1 px-3 py-2 text-sm font-medium"
                onClick={() => setActive(index())}
              >
                <span class="relative z-10">{tab}</span>
                <Show when={active() === index()}>
                  <motion.div
                    layoutId="tab-indicator"
                    class="absolute inset-0 rounded-md border border-primary/20 bg-primary/10"
                  />
                </Show>
              </button>
            )}
          </For>
        </motion.div>
      </div>
    </Animation>
  );
};
