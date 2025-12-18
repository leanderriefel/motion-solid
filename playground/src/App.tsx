import { createSignal, onCleanup, Show } from "solid-js";
import type { JSX } from "solid-js";
import { AnimatePresence, motion } from "motion-solid";

type Theme = "light" | "dark";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const buttonClasses =
  "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors";

function DemoCard(props: {
  title: string;
  description?: string;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <div class={`ui-panel rounded-2xl border p-5 ${props.class ?? ""}`}>
      <h3 class="text-base font-semibold">{props.title}</h3>
      <Show when={props.description}>
        <p class="mt-1 text-sm ui-muted">{props.description}</p>
      </Show>
      <div class="mt-4">{props.children}</div>
    </div>
  );
}

function BasicAnimation() {
  const [active, setActive] = createSignal(false);

  return (
    <div class="flex flex-col items-center gap-4">
      <motion.div
        class="grid h-24 w-24 cursor-pointer select-none place-items-center rounded-2xl text-sm font-semibold text-white"
        style={{
          background:
            "linear-gradient(135deg, rgba(99, 102, 241, 1), rgba(236, 72, 153, 1))",
        }}
        animate={{
          scale: active() ? 1.15 : 1,
          rotate: active() ? 180 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={() => setActive((v) => !v)}
      >
        Click me
      </motion.div>
      <button
        class={`${buttonClasses} ui-control`}
        onClick={() => setActive((v) => !v)}
      >
        Toggle
      </button>
    </div>
  );
}

function GesturesDemo() {
  return (
    <div class="flex justify-center">
      <motion.div
        class="grid h-24 w-24 cursor-pointer select-none place-items-center rounded-2xl text-sm font-semibold text-white"
        style={{
          background:
            "linear-gradient(135deg, rgba(59, 130, 246, 1), rgba(99, 102, 241, 1))",
        }}
        initial={{ opacity: 0.85 }}
        whileHover={{ scale: 1.08, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        Hover / Tap
      </motion.div>
    </div>
  );
}

function SpringDemo() {
  const [stiffness, setStiffness] = createSignal(300);
  const [damping, setDamping] = createSignal(20);
  const [target, setTarget] = createSignal(0);

  return (
    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="space-y-1">
          <span class="text-xs font-medium ui-muted">
            Stiffness: {stiffness()}
          </span>
          <input
            type="range"
            min="50"
            max="800"
            step="10"
            value={stiffness()}
            onInput={(e) => setStiffness(Number(e.currentTarget.value))}
            class="w-full"
          />
        </label>
        <label class="space-y-1">
          <span class="text-xs font-medium ui-muted">Damping: {damping()}</span>
          <input
            type="range"
            min="5"
            max="60"
            step="1"
            value={damping()}
            onInput={(e) => setDamping(Number(e.currentTarget.value))}
            class="w-full"
          />
        </label>
      </div>

      <div class="ui-subpanel relative h-20 overflow-hidden rounded-xl border">
        <motion.div
          class="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-xl text-xs font-semibold text-white"
          style={{
            background:
              "linear-gradient(135deg, rgba(16, 185, 129, 1), rgba(34, 211, 238, 1))",
          }}
          animate={{ x: target() }}
          transition={{
            type: "spring",
            stiffness: stiffness(),
            damping: damping(),
          }}
        />
      </div>

      <button
        class={`${buttonClasses} ui-control w-full`}
        onClick={() => setTarget((x) => (x === 0 ? 180 : 0))}
      >
        Animate
      </button>
    </div>
  );
}

function PresenceDemo() {
  const [show, setShow] = createSignal(true);

  return (
    <div class="space-y-4">
      <button
        class={`${buttonClasses} ui-control w-full`}
        onClick={() => setShow((v) => !v)}
      >
        {show() ? "Hide" : "Show"}
      </button>

      <div class="flex h-28 items-center justify-center">
        <AnimatePresence>
          {show() && (
            <motion.div
              class="grid h-20 w-20 place-items-center rounded-2xl text-sm font-semibold text-white"
              style={{
                background:
                  "linear-gradient(135deg, rgba(168, 85, 247, 1), rgba(236, 72, 153, 1))",
              }}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            >
              Hello
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DragDemo() {
  return (
    <div class="ui-subpanel relative h-44 overflow-hidden rounded-xl border">
      <motion.div
        class="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 cursor-grab select-none place-items-center rounded-2xl text-xs font-semibold text-white"
        style={{
          background:
            "linear-gradient(135deg, rgba(245, 158, 11, 1), rgba(239, 68, 68, 1))",
        }}
        drag
        dragConstraints={{ top: -60, left: -100, right: 100, bottom: 60 }}
        dragElastic={0.1}
        dragMomentum={false}
        whileDrag={{ scale: 1.1, cursor: "grabbing" }}
      >
        Drag
      </motion.div>
    </div>
  );
}

function KeyframesDemo() {
  return (
    <div class="ui-subpanel flex h-32 items-center justify-center overflow-hidden rounded-xl border">
      <motion.div
        class="grid h-16 w-16 place-items-center rounded-2xl text-xs font-semibold text-white"
        style={{
          background:
            "linear-gradient(135deg, rgba(132, 204, 22, 1), rgba(16, 185, 129, 1))",
        }}
        animate={{
          scale: [1, 1.2, 1, 1.2, 1],
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function ListDemo() {
  const [items, setItems] = createSignal([1, 2, 3]);
  const [selected, setSelected] = createSignal(1);
  const [expanded, setExpanded] = createSignal<number | null>(null);
  let nextId = 4;

  const reset = () => {
    setItems([1, 2, 3]);
    setSelected(1);
    setExpanded(null);
    nextId = 4;
  };

  const addItem = () => {
    const id = nextId++;
    setItems((prev) => [...prev, id]);
  };

  const shuffleItems = () => {
    setItems((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = next[i]!;
        next[i] = next[j]!;
        next[j] = tmp;
      }
      return next;
    });
  };

  const removeItem = (id: number) => {
    const next = items().filter((i) => i !== id);
    setItems(next);

    if (selected() === id) setSelected(next[0] ?? id);
    if (expanded() === id) setExpanded(null);
  };

  return (
    <div class="space-y-3">
      <div class="grid gap-2 sm:grid-cols-3">
        <button class={`${buttonClasses} ui-control`} onClick={addItem}>
          Add
        </button>
        <button class={`${buttonClasses} ui-control`} onClick={shuffleItems}>
          Shuffle
        </button>
        <button class={`${buttonClasses} ui-control`} onClick={reset}>
          Reset
        </button>
      </div>

      <div class="space-y-2">
        <AnimatePresence>
          {items().map((item) => (
            <motion.div
              key={item}
              layout
              class="ui-subpanel relative overflow-hidden rounded-lg border p-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div class="flex items-center justify-between gap-3">
                <button
                  class="text-left text-sm font-medium"
                  onClick={() => setSelected(item)}
                >
                  Item {item}
                </button>
                <div class="flex items-center gap-3">
                  <button
                    class="text-xs ui-muted hover:text-current"
                    onClick={() =>
                      setExpanded((current) => (current === item ? null : item))
                    }
                  >
                    {expanded() === item ? "Collapse" : "Expand"}
                  </button>
                  <button
                    class="text-xs ui-muted hover:text-red-500"
                    onClick={() => removeItem(item)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <Show when={expanded() === item}>
                <div class="mt-2 text-xs ui-muted">
                  Expanded content changes height, pushing siblings.
                </div>
              </Show>

              <Show when={selected() === item}>
                <motion.div
                  layoutId="underline"
                  class="absolute inset-x-3 bottom-1 h-0.5 rounded-full"
                  style={{ background: "rgba(99, 102, 241, 1)" }}
                />
              </Show>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ModalDemo() {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <button
        class={`${buttonClasses} ui-control w-full`}
        onClick={() => setOpen(true)}
      >
        Open Modal
      </button>

      <AnimatePresence>
        {open() && (
          <motion.div
            class="fixed inset-0 z-50 grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            style={{
              background: "rgba(0, 0, 0, 0.5)",
              "backdrop-filter": "blur(4px)",
            }}
          >
            <motion.div
              class="ui-card w-full max-w-sm rounded-2xl border p-6"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              <h4 class="text-lg font-semibold">Animated Modal</h4>
              <p class="mt-2 text-sm ui-muted">
                This modal animates in and out smoothly using AnimatePresence.
              </p>
              <button
                class={`${buttonClasses} ui-control mt-4 w-full`}
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function VariantsDemo() {
  const [active, setActive] = createSignal(false);

  const variants = {
    inactive: {
      scale: 1,
      backgroundColor: "rgba(99, 102, 241, 1)",
      borderRadius: "16px",
    },
    active: {
      scale: 1.1,
      backgroundColor: "rgba(236, 72, 153, 1)",
      borderRadius: "50%",
    },
  };

  return (
    <div class="flex flex-col items-center gap-4">
      <motion.div
        class="grid h-24 w-24 cursor-pointer select-none place-items-center text-sm font-semibold text-white"
        variants={variants}
        initial="inactive"
        animate={active() ? "active" : "inactive"}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={() => setActive((v) => !v)}
      >
        Click
      </motion.div>
      <span class="text-xs ui-muted">
        State: {active() ? "active" : "inactive"}
      </span>
    </div>
  );
}

function SharedLayoutDemo() {
  const tabs = ["Home", "About", "Contact"] as const;
  const [activeTab, setActiveTab] = createSignal<(typeof tabs)[number]>("Home");

  return (
    <div class="space-y-4">
      <div class="flex gap-1 ui-subpanel rounded-lg border p-1">
        {tabs.map((tab) => (
          <button
            class="relative flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            style={{
              color: activeTab() === tab ? "white" : undefined,
            }}
            onClick={() => setActiveTab(tab)}
          >
            {activeTab() === tab && (
              <motion.div
                layoutId="active-tab"
                class="absolute inset-0 rounded-md"
                style={{ background: "rgba(99, 102, 241, 1)" }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span class="relative z-10">{tab}</span>
          </button>
        ))}
      </div>
      <div class="ui-subpanel rounded-lg border p-4 text-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            Content for <strong>{activeTab()}</strong> tab
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function LayoutPositionDemo() {
  const [expanded, setExpanded] = createSignal(false);

  return (
    <div class="space-y-4">
      <button
        class={`${buttonClasses} ui-control w-full`}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded() ? "Collapse" : "Expand"}
      </button>
      <div
        class="grid gap-3"
        style={{
          "grid-template-columns": expanded() ? "1fr" : "1fr 1fr",
        }}
      >
        {[1, 2, 3, 4].map((item) => (
          <motion.div
            layout
            class="ui-subpanel grid place-items-center rounded-lg border p-4 text-sm font-medium"
            style={{
              height: expanded() ? "80px" : "60px",
            }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          >
            Item {item}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CardExpandDemo() {
  const [selectedId, setSelectedId] = createSignal<number | null>(null);
  const cards = [
    { id: 1, title: "Spring", color: "rgba(99, 102, 241, 1)" },
    { id: 2, title: "Summer", color: "rgba(236, 72, 153, 1)" },
    { id: 3, title: "Autumn", color: "rgba(245, 158, 11, 1)" },
    { id: 4, title: "Winter", color: "rgba(59, 130, 246, 1)" },
  ];

  return (
    <>
      <div class="grid grid-cols-2 gap-2">
        {cards.map((card) => (
          <motion.div
            layoutId={`card-${card.id}`}
            class="cursor-pointer rounded-lg p-3 text-center text-sm font-medium text-white"
            style={{ background: card.color }}
            onClick={() => setSelectedId(card.id)}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          >
            {card.title}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId() !== null && (
          <motion.div
            class="fixed inset-0 z-50 grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setSelectedId(null)}
            style={{
              background: "rgba(0, 0, 0, 0.5)",
              "backdrop-filter": "blur(4px)",
            }}
          >
            <motion.div
              layoutId={`card-${selectedId()}`}
              class="w-full max-w-xs cursor-pointer rounded-2xl p-6 text-center text-white"
              style={{
                background: cards.find((c) => c.id === selectedId())?.color,
              }}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                setSelectedId(null);
              }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            >
              <h3 class="text-xl font-bold">
                {cards.find((c) => c.id === selectedId())?.title}
              </h3>
              <p class="mt-2 text-sm opacity-90">
                Click to close this expanded card
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ToastDemo() {
  type Toast = { id: number; message: string };
  const [toasts, setToasts] = createSignal<Toast[]>([]);
  let nextId = 1;
  const timers = new Map<number, number>();

  const addToast = () => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message: `Toast #${id}` }].slice(-3));
    const timer = window.setTimeout(() => removeToast(id), 3000);
    timers.set(id, timer);
  };

  const removeToast = (id: number) => {
    const timer = timers.get(id);
    if (timer) window.clearTimeout(timer);
    timers.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  onCleanup(() => {
    for (const timer of timers.values()) window.clearTimeout(timer);
  });

  return (
    <div class="space-y-3">
      <button class={`${buttonClasses} ui-control w-full`} onClick={addToast}>
        Show Toast
      </button>

      <div class="min-h-[100px] space-y-2">
        <AnimatePresence>
          {toasts().map((toast) => (
            <motion.div
              key={toast.id}
              class="ui-card flex items-center justify-between rounded-lg border p-3"
              initial={{ opacity: 0, y: -10, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.2 }}
            >
              <span class="text-sm">{toast.message}</span>
              <button
                class="text-xs ui-muted"
                onClick={() => removeToast(toast.id)}
              >
                Dismiss
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = createSignal<Theme>(getInitialTheme());

  const toggleTheme = () => {
    const next = theme() === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("theme", next);
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  // Set initial theme
  if (typeof window !== "undefined" && theme() === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  return (
    <div class="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <header class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold tracking-tight">motion-solid</h1>
            <p class="mt-1 text-sm ui-muted">
              Animation library for SolidJS. Explore the demos below.
            </p>
          </div>
          <button class={`${buttonClasses} ui-control`} onClick={toggleTheme}>
            {theme() === "dark" ? "Light" : "Dark"} mode
          </button>
        </header>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DemoCard
            title="Basic Animation"
            description="Animate between states with spring physics"
          >
            <BasicAnimation />
          </DemoCard>

          <DemoCard title="Gestures" description="Hover and tap interactions">
            <GesturesDemo />
          </DemoCard>

          <DemoCard
            title="Spring Tuning"
            description="Adjust stiffness and damping"
          >
            <SpringDemo />
          </DemoCard>

          <DemoCard
            title="AnimatePresence"
            description="Enter and exit animations"
          >
            <PresenceDemo />
          </DemoCard>

          <DemoCard
            title="Drag"
            description="Draggable elements with constraints"
          >
            <DragDemo />
          </DemoCard>

          <DemoCard title="Keyframes" description="Looping keyframe animations">
            <KeyframesDemo />
          </DemoCard>

          <DemoCard title="Variants" description="Named animation states">
            <VariantsDemo />
          </DemoCard>

          <DemoCard
            title="Shared Layout"
            description="Animate between elements with layoutId"
          >
            <SharedLayoutDemo />
          </DemoCard>

          <DemoCard
            title="Layout Position"
            description="Smooth grid layout transitions"
          >
            <LayoutPositionDemo />
          </DemoCard>

          <DemoCard
            title="Card Expand"
            description="Expand cards with shared layout"
          >
            <CardExpandDemo />
          </DemoCard>

          <DemoCard
            title="List Animations"
            description="Animate list items in and out"
          >
            <ListDemo />
          </DemoCard>

          <DemoCard
            title="Modal"
            description="Overlay with enter/exit animation"
          >
            <ModalDemo />
          </DemoCard>

          <DemoCard
            title="Toast Notifications"
            description="Animated notification stack"
          >
            <ToastDemo />
          </DemoCard>
        </div>

        <footer class="mt-12 border-t border-gray-200 pt-6 text-center text-sm ui-muted dark:border-gray-800">
          <p>
            Built with{" "}
            <a
              href="https://github.com/sst/motion-solid"
              class="underline hover:text-current"
            >
              motion-solid
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
