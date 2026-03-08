import { motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./drag-demo.tsx?raw";

export const DragDemo = () => {
  return (
    <Animation
      name="Drag"
      class="min-h-[300px]"
      wrapperClass="w-full p-4"
      source={source}
    >
      <div class="flex h-56 w-full items-center justify-center rounded-[28px] border border-border bg-muted">
        <motion.div
          drag
          dragConstraints={{
            top: -72,
            right: 132,
            bottom: 72,
            left: -132,
          }}
          dragElastic={0.1}
          dragMomentum={false}
          whileDrag={{ scale: 1.08 }}
          class="size-20 rounded-full bg-primary shadow-lg"
          style={{ "touch-action": "none" }}
        />
      </div>
    </Animation>
  );
};
