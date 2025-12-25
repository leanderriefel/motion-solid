import { Animation } from "./animation";
import { motion } from "motion-solid";
import source from "./first-animation.tsx?raw";

export const FirstAnimation = () => {
  return (
    <Animation
      name="First Animation"
      class="h-[200px]"
      showReloadButton
      source={source}
    >
      <motion.div
        class="size-24 rounded-2xl bg-primary shadow-lg"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />
    </Animation>
  );
};
