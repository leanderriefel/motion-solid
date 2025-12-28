import { createSignal, Show } from "solid-js";
import { motion } from "motion-solid";
import source from "./layout-border-radius.tsx?raw";
import { Animation } from "./animation";

export const LayoutBorderRadius = () => {
  const [expanded, setExpanded] = createSignal(false);

  return (
    <Animation name="Layout Border Radius" class="h-[600px]" source={source}>
      <div class="flex flex-col items-center gap-6">
        <motion.p
          layout="position"
          layoutDependencies={[expanded]}
          transition={{
            visualDuration: 1,
            type: "spring",
            bounce: 0.5,
          }}
          class="text-sm text-muted-foreground"
        >
          Click the card to toggle size. Watch the corners and shadow during the
          animation.
        </motion.p>
        <button
          type="button"
          class="focus:outline-none"
          onClick={() => setExpanded((v) => !v)}
        >
          <motion.div
            layout
            layoutDependencies={[expanded]}
            transition={{
              visualDuration: 1,
              type: "spring",
              bounce: 0.5,
            }}
            class="flex items-center justify-center bg-primary cursor-pointer select-none"
            style={{
              width: expanded() ? "400px" : "100px",
              height: expanded() ? "400px" : "100px",
              "border-radius": "24px",
              "box-shadow": "0 4px 16px 0 var(--color-foreground)",
            }}
          >
            <motion.p
              layout
              layoutDependencies={[expanded]}
              transition={{
                visualDuration: 1,
                type: "spring",
                bounce: 0.5,
              }}
              class="text-primary-foreground! font-medium!"
              style={{
                "font-size": expanded() ? "32px" : "16px",
              }}
            >
              <Show when={expanded()} fallback="Small">
                Large
              </Show>
            </motion.p>
          </motion.div>
        </button>
      </div>
    </Animation>
  );
};

export default LayoutBorderRadius;
