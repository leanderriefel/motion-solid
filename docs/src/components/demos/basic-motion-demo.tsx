import { motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./basic-motion-demo.tsx?raw";

export const BasicMotionDemo = () => {
  return (
    <Animation
      name="Basic Motion"
      class="h-[220px]"
      showReloadButton
      source={source}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.25,
          scale: { type: "spring", stiffness: 420, damping: 24 },
        }}
        class="size-24 rounded-[28px] bg-primary shadow-lg"
      />
    </Animation>
  );
};
