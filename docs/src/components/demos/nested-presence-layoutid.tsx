import { For, Show, createMemo, createSignal } from "solid-js";
import { AnimatePresence, motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./nested-presence-layoutid.tsx?raw";

type PresenceMode = "sync" | "wait" | "popLayout";

type Thread = {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
};

const threads: Thread[] = [
  {
    id: "thread-1",
    title: "Projection refactor",
    preview: "Edge-case cleanup for nested exits and layoutId handoff.",
    messageCount: 12,
  },
  {
    id: "thread-2",
    title: "Viewport regressions",
    preview: "Investigating transformed scroll container interactions.",
    messageCount: 5,
  },
  {
    id: "thread-3",
    title: "Parity test pass",
    preview: "Cross-checking with motion/react layout sequencing.",
    messageCount: 18,
  },
];

const modeOrder: PresenceMode[] = ["sync", "wait", "popLayout"];

const nextThreadId = (current: string | null): string => {
  if (!current) return threads[0]!.id;
  const currentIndex = threads.findIndex((thread) => thread.id === current);
  const nextIndex = (currentIndex + 1) % threads.length;
  return threads[nextIndex]!.id;
};

export const NestedPresenceLayoutId = () => {
  const [activeId, setActiveId] = createSignal<string | null>(threads[0]!.id);
  const [mode, setMode] = createSignal<PresenceMode>("popLayout");
  const [propagate, setPropagate] = createSignal(true);
  const [showMeta, setShowMeta] = createSignal(true);

  const activeThread = createMemo(() =>
    threads.find((thread) => thread.id === activeId()),
  );

  const cycleMode = () => {
    const currentIndex = modeOrder.indexOf(mode());
    const nextIndex = (currentIndex + 1) % modeOrder.length;
    setMode(modeOrder[nextIndex]!);
  };

  const rapidSwitch = () => {
    const first = nextThreadId(activeId());
    const second = nextThreadId(first);
    setActiveId(first);
    queueMicrotask(() => setActiveId(second));
  };

  return (
    <Animation name="Nested Presence + layoutId" source={source} scrollable>
      <div class="w-full space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            onClick={cycleMode}
          >
            Mode: {mode()}
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            onClick={() => setPropagate((prev) => !prev)}
          >
            Propagate: {propagate() ? "on" : "off"}
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            onClick={() => setShowMeta((prev) => !prev)}
          >
            Meta panel: {showMeta() ? "show" : "hide"}
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            onClick={rapidSwitch}
          >
            Rapid switch
          </button>
        </div>

        <div class="grid gap-3 md:grid-cols-[1fr_1.4fr]">
          <motion.ul
            layout
            class="m-0 list-none space-y-2 p-0"
            style={{ "list-style": "none" }}
          >
            <For each={threads}>
              {(thread) => (
                <motion.li layout style={{ "list-style": "none" }}>
                  <motion.div
                    layout
                    class="relative rounded-xl border bg-foreground/5 p-3"
                    transition={{
                      layout: { type: "spring", stiffness: 420, damping: 34 },
                    }}
                  >
                    <button
                      type="button"
                      class="w-full text-left"
                      onClick={() =>
                        setActiveId((current) =>
                          current === thread.id ? null : thread.id,
                        )
                      }
                    >
                      <motion.p layout="position" class="text-sm font-medium">
                        {thread.title}
                      </motion.p>
                      <motion.p
                        layout="position"
                        class="mt-1 text-xs text-muted-foreground"
                      >
                        {thread.preview}
                      </motion.p>
                      <motion.span layout="position" class="mt-2 block text-xs">
                        {thread.messageCount} messages
                      </motion.span>
                    </button>

                    <Show when={activeId() === thread.id}>
                      <motion.div
                        layoutId="nested-thread-highlight"
                        class="pointer-events-none absolute inset-0 rounded-xl border-2 border-primary/80"
                      />
                    </Show>
                  </motion.div>
                </motion.li>
              )}
            </For>
          </motion.ul>

          <AnimatePresence mode={mode()} initial={false}>
            <Show
              when={activeThread()}
              keyed
              fallback={
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  class="rounded-xl border bg-foreground/5 p-4 text-sm text-muted-foreground"
                >
                  Select a thread to preview nested presence transitions.
                </motion.div>
              }
            >
              {(thread) => (
                <motion.section
                  key={thread.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.24 }}
                  class="relative rounded-xl border bg-foreground/5 p-4"
                >
                  <motion.div
                    layoutId="nested-thread-highlight"
                    class="pointer-events-none absolute inset-0 rounded-xl border-2 border-primary/80"
                  />
                  <motion.h4 layout="position" class="text-sm font-semibold">
                    {thread.title}
                  </motion.h4>
                  <motion.p
                    layout="position"
                    class="mt-1 text-xs text-muted-foreground"
                  >
                    Mode {mode()} with nested meta transitions.
                  </motion.p>

                  <AnimatePresence mode="popLayout" propagate={propagate()}>
                    <Show when={showMeta()}>
                      <motion.div
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        class="mt-3 overflow-hidden rounded-md border border-border/60 bg-background/70 p-2 text-xs"
                      >
                        Nested metadata: {thread.messageCount} unread segments,
                        shared layout handoff active.
                      </motion.div>
                    </Show>
                  </AnimatePresence>

                  <motion.ul
                    layout
                    class="m-0 mt-3 list-none space-y-2 p-0"
                    style={{ "list-style": "none" }}
                  >
                    <For each={[1, 2, 3]}>
                      {(segment) => (
                        <motion.li
                          layout="position"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          class="rounded-md border bg-background/60 px-2 py-1 text-xs"
                          style={{ "list-style": "none" }}
                        >
                          Message segment {segment} · thread {thread.id}
                        </motion.li>
                      )}
                    </For>
                  </motion.ul>
                </motion.section>
              )}
            </Show>
          </AnimatePresence>
        </div>
      </div>
    </Animation>
  );
};
