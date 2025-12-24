import { motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./enter-animation.tsx?raw";

export const EnterAnimation = () => {
  return (
    <Animation
      name="Enter Animation"
      class="h-[200px]"
      showReloadButton
      source={source}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.4,
          scale: { type: "spring", visualDuration: 0.4, bounce: 0.5 },
        }}
        class="size-24 rounded-full bg-primary shadow-lg"
      />
    </Animation>
  );
};
