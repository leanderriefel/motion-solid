import { createSignal, Show } from "solid-js";
import { motion } from "motion-solid";
import source from "./accordion.tsx?raw";
import { Animation } from "../demos/animation";

export const Accordion = () => {
  const [expanded, setExpanded] = createSignal(false);

  return (
    <Animation name="Accordion" source={source}>
      <motion.div
        layout
        layoutDependencies={[expanded]}
        class="w-full max-w-xs overflow-hidden rounded-xl border border-border bg-card"
      >
        <motion.button
          layout="position"
          type="button"
          class="w-full px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50"
          onClick={() => setExpanded((v) => !v)}
        >
          <div class="flex items-center justify-between gap-4">
            <span>What is a layout transition?</span>
            <motion.span layout="position" class="text-muted-foreground">
              {expanded() ? "-" : "+"}
            </motion.span>
          </div>
        </motion.button>
        <Show when={expanded()}>
          <motion.div
            layout
            class="px-4 pb-4 pt-0 text-sm text-muted-foreground"
          >
            Layout transitions animate size and position changes smoothly when
            you update your component's state.
          </motion.div>
        </Show>
      </motion.div>
    </Animation>
  );
};
