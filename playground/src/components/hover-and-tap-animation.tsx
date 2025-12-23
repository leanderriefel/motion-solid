import { motion } from "motion-solid";
import { Animation } from "./animation";

export const HoverAndTapAnimation = () => {
  return (
    <Animation name="Hover and Tap Animation" class="h-[200px]">
      <motion.div
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        class="size-24 rounded-2xl bg-primary shadow-lg"
      />
    </Animation>
  );
};
