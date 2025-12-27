import { motion } from "motion-solid";
import { createSignal, For, Show } from "solid-js";
import { Animation } from "./animation";
import { cn } from "../../utils/cn";
import source from "./layout-underline-animation.tsx?raw";

export const LayoutUnderlineAnimation = () => {
  const [selected, setSelected] = createSignal(0);

  return (
    <Animation
      name="Layout Underline Animation"
      class="h-[400px]"
      source={source}
    >
      <div class="grid grid-rows-[auto_auto] w-full bg-background p-4 rounded-xl">
        <div class="h-12 grid grid-cols-3 place-items-center w-full border-b">
          <For each={Foods}>
            {({ emoji, name }, index) => (
              <button
                type="button"
                class={cn(
                  "relative size-full flex justify-center items-center transition-colors rounded-t-lg",
                  {
                    "bg-primary/5": selected() === index(),
                  },
                )}
                onClick={() => setSelected(index())}
              >
                {emoji} {name}
                <Show when={selected() === index()}>
                  <motion.div
                    class="absolute -bottom-px left-0 h-px w-full bg-primary"
                    layoutId="underline"
                    layoutDependencies={[selected]}
                    transition={{ type: "tween" }}
                  />
                </Show>
              </button>
            )}
          </For>
        </div>
        <div class="h-54 flex items-center justify-center text-9xl">
          {Foods[selected()].emoji}
        </div>
      </div>
    </Animation>
  );
};

const Foods = [
  {
    emoji: "🍅",
    name: "Tomato",
  },
  {
    emoji: "🥬",
    name: "Lettuce",
  },
  {
    emoji: "🧀",
    name: "Cheese",
  },
];
