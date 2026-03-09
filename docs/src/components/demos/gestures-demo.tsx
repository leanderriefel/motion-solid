import { motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./gestures-demo.tsx?raw";

export const GesturesDemo = () => {
  return (
    <Animation name="Gestures" class="h-[220px]" source={source}>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        whileFocus={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        type="button"
        class="rounded-[24px] bg-primary px-8 py-5 text-base font-medium text-primary-foreground shadow-lg"
      >
        Press
      </motion.button>
    </Animation>
  );
};
