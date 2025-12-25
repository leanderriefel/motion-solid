import { createSignal, For } from "solid-js";
import { motion, useLayoutTransition } from "motion-solid";
import source from "./nested-layout.tsx?raw";
import { Animation } from "../demos/animation";

export const NestedLayout = () => {
  const [expanded, setExpanded] = createSignal(false);
  const [dense, setDense] = createSignal(false);
  let container: HTMLDivElement | undefined;
  const transition = useLayoutTransition(() => container, {
    scope: "descendants",
  });

  const toggle = () =>
    transition(() => {
      setExpanded((v) => !v);
      setDense((v) => !v);
    });

  const count = () => (dense() ? 3 : 6);

  return (
    <Animation name="Nested Layout" source={source}>
      <motion.div
        ref={(el) => {
          container = el;
        }}
        layout
        class="w-full max-w-xs overflow-hidden rounded-xl border border-border bg-card"
      >
        <motion.div
          layout="position"
          class="flex items-center justify-between border-b border-border px-4 py-3"
        >
          <span class="text-sm font-medium">Card Header</span>
          <motion.button
            layout="position"
            type="button"
            class="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
            onClick={toggle}
          >
            {expanded() ? "Collapse" : "Expand"}
          </motion.button>
        </motion.div>
        <motion.div layout class="p-4">
          <For each={Array.from({ length: count() })}>
            {(_, i) => (
              <motion.div
                layout
                class="mb-2 h-8 rounded-md border border-border/50 bg-muted/30 last:mb-0"
              >
                <motion.div
                  layout="position"
                  class="flex h-full items-center px-3 text-xs text-muted-foreground"
                >
                  Item {i() + 1}
                </motion.div>
              </motion.div>
            )}
          </For>
        </motion.div>
      </motion.div>
    </Animation>
  );
};
