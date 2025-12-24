import { createSignal } from "solid-js";
import { motion } from "motion-solid";
import source from "./layout-animation.tsx?raw";

import { Animation } from "./animation";

export const LayoutAnimation = () => {
  const [isOn, setIsOn] = createSignal(false);

  return (
    <Animation name="Layout Animation" class="h-[200px]" source={source}>
      <button
        type="button"
        aria-pressed={isOn()}
        class={`flex h-12 w-24 rounded-full bg-primary/20 p-2 ${
          isOn() ? "justify-start" : "justify-end"
        }`}
        onClick={() => setIsOn((v) => !v)}
      >
        <motion.div
          class="size-8 rounded-full bg-primary"
          layout
          transition={{ type: "spring", bounce: 0.4, visualDuration: 0.3 }}
        />
      </button>
    </Animation>
  );
};

export default LayoutAnimation;
