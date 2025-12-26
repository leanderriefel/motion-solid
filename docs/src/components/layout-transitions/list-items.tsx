import { createSignal, For } from "solid-js";
import { motion } from "motion-solid";
import source from "./list-items.tsx?raw";
import { Animation } from "../demos/animation";

export const ListItems = () => {
  const [items, setItems] = createSignal(["Task 1", "Task 2", "Task 3"]);

  const add = () => {
    const nextId = items().length + 1;
    setItems((v) => [...v, `Task ${nextId}`]);
  };

  const remove = (idx: number) => {
    setItems((v) => v.filter((_, i) => i !== idx));
  };

  return (
    <Animation name="List Items" source={source}>
      <div class="flex flex-col gap-3">
        <motion.div
          layout
          layoutDependencies={[items]}
          class="flex flex-col gap-2"
        >
          <For each={items()}>
            {(item, index) => (
              <motion.div
                layout
                class="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <motion.div layout="position" class="flex-1 text-sm">
                  {item}
                </motion.div>
                <motion.button
                  layout="position"
                  type="button"
                  class="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => remove(index())}
                >
                  Remove
                </motion.button>
              </motion.div>
            )}
          </For>
        </motion.div>
        <motion.button
          layout="position"
          type="button"
          class="w-full rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          onClick={add}
        >
          Add item
        </motion.button>
      </div>
    </Animation>
  );
};
