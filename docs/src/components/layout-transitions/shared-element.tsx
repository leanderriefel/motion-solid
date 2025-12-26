import { createSignal, For, Show } from "solid-js";
import { motion } from "motion-solid";
import source from "./shared-element.tsx?raw";
import { Animation } from "../demos/animation";

const items = ["Apple", "Banana", "Cherry", "Date"];

export const SharedElement = () => {
  const [selected, setSelected] = createSignal<number | null>(null);

  return (
    <Animation name="Shared Element" source={source}>
      <div class="flex flex-col gap-4">
        <div class="text-sm text-muted-foreground">
          Click an item to move it between lists.
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <div class="text-xs uppercase tracking-wide text-muted-foreground">
              Source
            </div>
            <motion.div
              layout
              layoutDependencies={[selected]}
              class="flex flex-col gap-2"
            >
              <For each={items}>
                {(item, index) => (
                  <Show when={selected() !== index()}>
                    <motion.button
                      layout
                      layoutId={`item-${index()}`}
                      type="button"
                      class="w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-sm"
                      onClick={() => setSelected(index())}
                    >
                      {item}
                    </motion.button>
                  </Show>
                )}
              </For>
            </motion.div>
          </div>
          <div class="space-y-2">
            <div class="text-xs uppercase tracking-wide text-muted-foreground">
              Selected
            </div>
            <motion.div
              layout
              layoutDependencies={[selected]}
              class="min-h-8 flex flex-col gap-2"
            >
              <Show when={selected() !== null}>
                <motion.button
                  layout
                  layoutId={`item-${selected()}`}
                  type="button"
                  class="w-full rounded-lg border border-primary bg-primary/10 px-3 py-2 text-left text-sm text-primary"
                  onClick={() => setSelected(null)}
                >
                  {items[selected()!]}
                </motion.button>
              </Show>
            </motion.div>
          </div>
        </div>
      </div>
    </Animation>
  );
};
