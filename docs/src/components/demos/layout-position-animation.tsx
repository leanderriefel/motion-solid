import { createSignal } from "solid-js";
import { motion } from "motion-solid";
import source from "./layout-position-animation.tsx?raw";

import { Animation } from "./animation";

const transition = {
  duration: 1.5,
};

const summary = `It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.`;

const long = `${summary} The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).`;

export const LayoutPositionAnimation = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <Animation name="Layout Position" source={source}>
      <motion.div
        layout
        layoutDependencies={[isOpen]}
        transition={transition}
        onClick={() => setIsOpen((v) => !v)}
        class="cursor-pointer overflow-hidden rounded-lg bg-white p-6 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        style={{ "max-width": "320px" }}
      >
        <motion.div
          layout="position"
          layoutDependencies={[isOpen]}
          transition={transition}
        >
          {isOpen() ? long : summary}
        </motion.div>
      </motion.div>
    </Animation>
  );
};

export default LayoutPositionAnimation;
