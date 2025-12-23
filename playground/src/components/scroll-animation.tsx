import type { Variants } from "motion-dom";
import { For, createSignal } from "solid-js";
import { motion } from "motion-solid";
import { Animation } from "./animation";

export const ScrollAnimation = () => {
  const [scrollContainer, setScrollContainer] =
    createSignal<HTMLDivElement | null>(null);

  return (
    <Animation
      name="Scroll Animation"
      class="h-[500px] overflow-y-auto overflow-x-hidden"
      containerRef={(el) => setScrollContainer(el)}
      scrollable
    >
      <div class="flex flex-col items-center pb-[100px] pt-[100px]">
        <For each={food}>
          {([emoji, hueA, hueB], i) => (
            <Card
              emoji={emoji}
              hueA={hueA}
              hueB={hueB}
              i={i()}
              scrollContainerRef={scrollContainer()}
            />
          )}
        </For>
      </div>
    </Animation>
  );
};

export default ScrollAnimation;

type CardProps = {
  emoji: string;
  hueA: number;
  hueB: number;
  i: number;
  scrollContainerRef: HTMLDivElement | null;
};

const Card = (props: CardProps) => {
  const background = `linear-gradient(306deg, ${hue(props.hueA)}, ${hue(props.hueB)})`;

  return (
    <motion.div
      class="relative mb-[-120px] flex items-center justify-center overflow-hidden pt-5"
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ amount: 0.8, root: props.scrollContainerRef }}
    >
      <div
        class="absolute inset-0"
        style={{
          background,
          "clip-path":
            'path("M 0 303.5 C 0 292.454 8.995 285.101 20 283.5 L 460 219.5 C 470.085 218.033 480 228.454 480 239.5 L 500 430 C 500 441.046 491.046 450 480 450 L 20 450 C 8.954 450 0 441.046 0 430 Z")',
        }}
      />
      <motion.div
        class="flex h-[430px] w-[300px] select-none items-center justify-center rounded-[20px] bg-foreground text-[164px] shadow"
        variants={cardVariants}
      >
        {props.emoji}
      </motion.div>
    </motion.div>
  );
};

const cardVariants: Variants = {
  offscreen: {
    y: 300,
  },
  onscreen: {
    y: 50,
    rotate: -10,
    transition: {
      type: "spring",
      bounce: 0.4,
      duration: 0.8,
    },
  },
};

const hue = (h: number) => `hsl(${h}, 100%, 50%)`;

const food = [
  ["🍅", 340, 10],
  ["🍊", 20, 40],
  ["🍋", 60, 90],
  ["🍐", 80, 120],
  ["🍏", 100, 140],
  ["🫐", 205, 245],
  ["🍆", 260, 290],
  ["🍇", 290, 320],
] satisfies ReadonlyArray<readonly [string, number, number]>;
