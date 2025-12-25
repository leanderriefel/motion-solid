import { A } from "@solidjs/router";
import { createSignal, For, onCleanup, onMount } from "solid-js";
import { AnimatePresence, motion, type StaggerFunction } from "motion-solid";
import { AnimatedLogo } from "~/components/logo";
import { BackgroundDots } from "~/components/background-dots";
import { cn } from "~/utils/cn";

type Token = { text: string; type: string };

const codeSnippets: Token[][] = [
  [
    { text: "<", type: "bracket" },
    { text: "motion", type: "tag" },
    { text: ".", type: "punct" },
    { text: "div", type: "tag" },
    { text: "\n  ", type: "plain" },
    { text: "animate", type: "attr" },
    { text: "=", type: "punct" },
    { text: "{{ ", type: "bracket" },
    { text: "opacity", type: "prop" },
    { text: ": ", type: "punct" },
    { text: "1", type: "number" },
    { text: " }}", type: "bracket" },
    { text: "\n", type: "plain" },
    { text: "/>", type: "bracket" },
  ],
  [
    { text: "<", type: "bracket" },
    { text: "motion", type: "tag" },
    { text: ".", type: "punct" },
    { text: "div", type: "tag" },
    { text: "\n  ", type: "plain" },
    { text: "whileHover", type: "attr" },
    { text: "=", type: "punct" },
    { text: "{{ ", type: "bracket" },
    { text: "scale", type: "prop" },
    { text: ": ", type: "punct" },
    { text: "1.1", type: "number" },
    { text: " }}", type: "bracket" },
    { text: "\n", type: "plain" },
    { text: "/>", type: "bracket" },
  ],
  [
    { text: "<", type: "bracket" },
    { text: "AnimatePresence", type: "component" },
    { text: ">", type: "bracket" },
    { text: "\n  ", type: "plain" },
    { text: "<", type: "bracket" },
    { text: "motion", type: "tag" },
    { text: ".", type: "punct" },
    { text: "div", type: "tag" },
    { text: "\n    ", type: "plain" },
    { text: "exit", type: "attr" },
    { text: "=", type: "punct" },
    { text: "{{ ", type: "bracket" },
    { text: "opacity", type: "prop" },
    { text: ": ", type: "punct" },
    { text: "0", type: "number" },
    { text: " }}", type: "bracket" },
    { text: "\n  ", type: "plain" },
    { text: "/>", type: "bracket" },
    { text: "\n", type: "plain" },
    { text: "</", type: "bracket" },
    { text: "AnimatePresence", type: "component" },
    { text: ">", type: "bracket" },
  ],
];

function SyntaxToken(props: { text: string; type: string }) {
  const classes = () => {
    switch (props.type) {
      case "tag":
        return "text-cyan-600 dark:text-cyan-400";
      case "component":
        return "text-teal-600 dark:text-teal-400";
      case "attr":
        return "text-violet-600 dark:text-violet-400";
      case "prop":
        return "text-sky-600 dark:text-sky-400";
      case "number":
        return "text-amber-600 dark:text-amber-400";
      case "string":
        return "text-emerald-600 dark:text-emerald-400";
      case "bracket":
        return "text-zinc-500 dark:text-zinc-400";
      case "punct":
        return "text-zinc-400 dark:text-zinc-500";
      default:
        return "";
    }
  };
  return <span class={classes()}>{props.text}</span>;
}

function CodeCard() {
  const [index, setIndex] = createSignal(0);

  onMount(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % codeSnippets.length);
    }, 3000);
    onCleanup(() => clearInterval(timer));
  });

  const currentSnippet = () => [{ id: index(), tokens: codeSnippets[index()] }];

  return (
    <div class="absolute inset-0 overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        <For each={currentSnippet()}>
          {(snippet) => (
            <motion.pre
              initial={{ opacity: 0, y: -50, filter: "blur(25px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 50, filter: "blur(25px)" }}
              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
              class="font-mono text-[13px] leading-relaxed whitespace-pre select-none"
            >
              <For each={snippet.tokens}>
                {(token) => <SyntaxToken text={token.text} type={token.type} />}
              </For>
            </motion.pre>
          )}
        </For>
      </AnimatePresence>
    </div>
  );
}

/**
 * Creates a 2D grid stagger function that radiates from the center.
 * Works with delayChildren in variants, just like the built-in stagger().
 */
function gridStagger(
  interval: number,
  cols: number,
  rows: number,
): StaggerFunction {
  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;

  const fn = (index: number): number => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const distance = Math.sqrt(
      Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2),
    );
    return distance * interval;
  };

  (fn as unknown as StaggerFunction).__isStagger = true;
  return fn as unknown as StaggerFunction;
}

function PerformanceDemo() {
  const rows = 7;
  const cols = 7;
  const cells = Array.from({ length: rows * cols }, (_, i) => i);

  return (
    <motion.div
      class="grid gap-1.5"
      style={{ "grid-template-columns": `repeat(${cols}, 1fr)` }}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            delayChildren: gridStagger(0.5, cols, rows),
          },
        },
      }}
    >
      <For each={cells}>
        {() => (
          <motion.div
            variants={{
              hidden: { scale: 1, opacity: 0.1 },
              visible: {
                scale: [1, 1.25, 1],
                opacity: [0.05, 1, 0.05],
                transition: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              },
            }}
            class="size-4 rounded-sm bg-primary"
            style={{ "box-shadow": "0 0 12px var(--primary)" }}
          />
        )}
      </For>
    </motion.div>
  );
}

export default function Home() {
  const [toggled, setToggled] = createSignal(false);

  onMount(() => {
    const timer = setInterval(() => {
      setToggled((t) => !t);
    }, 2000);
    onCleanup(() => clearInterval(timer));
  });

  return (
    <div class="flex flex-col items-center justify-center min-h-[calc(100vh-40px)] text-center pt-20">
      <div class="max-w-3xl px-4 w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          class="flex gap-x-4 items-center justify-center mb-4"
        >
          <h1 class="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
            Motion for Solid
          </h1>
          <AnimatedLogo class="size-12 fill-primary hover:fill-foreground duration-500" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          class="text-base text-muted-foreground mb-4 max-w-lg mx-auto"
        >
          An animation library for{" "}
          <a href="https://solidjs.com" target="_blank" class="underline">
            SolidJS
          </a>
          . Built on top of{" "}
          <a href="https://motion.dev" target="_blank" class="underline">
            Motion
          </a>
          .
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          class="text-xs text-muted-foreground/75 mb-20 max-w-lg mx-auto"
        >
          This is a community-driven project and not in any way affiliated with
          motion.dev
        </motion.p>

        <motion.div
          initial={{
            opacity: 0,
            y: 16,
          }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, delay: 0.3 },
          }}
          class="flex justify-center"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            tabIndex={-1}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 10,
              visualDuration: 0.3,
            }}
          >
            <A
              href="/docs/getting-started"
              class="px-5 relative overflow-hidden py-2.5 font-medium rounded-xl text-sm border border-primary text-foreground bg-primary/10 [box-shadow:0px_0px_40px_5px_var(--tw-shadow-color)] transition-all shadow-primary/20 hover:shadow-primary/35 before:absolute before:inset-0 before:bg-background before:-z-1"
            >
              Get Started
            </A>
          </motion.div>
        </motion.div>
      </div>

      <div class="mt-24 grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 max-w-6xl w-full text-left">
        <motion.div
          class={cn(
            "flex flex-col bg-card border border-border rounded-xl overflow-hidden",
            "[box-shadow:inset_05px_5px_20px_#0000001a,inset_-5px_-5px_20px_#ffffff] dark:[box-shadow:inset_5px_5px_20px_#000000,inset_-5px_-5px_20px_#ffffff08]",
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
        >
          <div class="h-48 relative overflow-hidden rounded-t-xl bg-muted/30">
            <CodeCard />
          </div>
          <div class="p-6 flex items-center justify-center grow">
            <p class="text-foreground font-medium text-sm text-center">
              Use the API surface you already know from Motion (previously
              Framer Motion).
            </p>
          </div>
        </motion.div>

        <motion.div
          class={cn(
            "flex flex-col bg-card border border-border rounded-xl overflow-hidden",
            "[box-shadow:inset_05px_5px_20px_#0000001a,inset_-5px_-5px_20px_#ffffff] dark:[box-shadow:inset_5px_5px_20px_#000000,inset_-5px_-5px_20px_#ffffff08]",
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
        >
          <div class="h-48 bg-muted/30 flex items-center justify-center relative overflow-hidden">
            <div class="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />
            <div
              class="w-32 h-16 bg-background border border-border rounded-full p-2 flex items-center shadow-sm"
              style={{
                "justify-content": toggled() ? "flex-end" : "flex-start",
              }}
            >
              <motion.div
                layout
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                class="size-12 bg-primary rounded-full shadow-md"
              />
            </div>
          </div>
          <div class="p-6 flex items-center justify-center grow">
            <p class="text-foreground font-medium text-sm text-center">
              Silky-smooth layout animations without ViewTransitions, keeping
              interactivity intact.
            </p>
          </div>
        </motion.div>

        <motion.div
          class={cn(
            "flex flex-col bg-card border border-border rounded-xl overflow-hidden",
            "[box-shadow:inset_05px_5px_20px_#0000001a,inset_-5px_-5px_20px_#ffffff] dark:[box-shadow:inset_5px_5px_20px_#000000,inset_-5px_-5px_20px_#ffffff08]",
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.6 } }}
        >
          <div class="h-48 bg-muted/30 flex items-center justify-center relative overflow-hidden">
            <div class="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-transparent opacity-50" />
            <PerformanceDemo />
          </div>
          <div class="p-6 flex items-center justify-center grow">
            <p class="text-foreground font-medium text-sm text-center ">
              Uses the well-established and performant motion-dom under the
              hood.
            </p>
          </div>
        </motion.div>
      </div>
      <BackgroundDots opacity={0.5} />
    </div>
  );
}
