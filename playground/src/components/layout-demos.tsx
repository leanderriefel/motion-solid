import { createSignal, For } from "solid-js";
import { motion } from "motion-solid";
import { Animation } from "./animation";

export const LayoutDemos = () => {
  return (
    <div class="flex w-full flex-col gap-12">
      <FlexDemo />
      <SizeDemo />
      <ListDemo />
      <SharedLayoutDemo />
      <ScaleCorrectionDemo />
    </div>
  );
};

const FlexDemo = () => {
  const [justify, setJustify] = createSignal("justify-start");

  return (
    <Animation name="Flex Change (Justify)" class="h-[200px]">
      <div
        class={`flex w-full cursor-pointer rounded-xl bg-muted/20 p-4 ${justify()}`}
        onClick={() =>
          setJustify((j) =>
            j === "justify-start"
              ? "justify-center"
              : j === "justify-center"
                ? "justify-end"
                : "justify-start",
          )
        }
      >
        <motion.div
          layout
          class="size-16 rounded-full bg-blue-500"
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            duration: 1,
          }}
        />
      </div>
    </Animation>
  );
};

const SizeDemo = () => {
  const [big, setBig] = createSignal(false);

  return (
    <Animation name="Size Change" class="h-[200px]">
      <div class="flex flex-col items-center gap-3">
        <motion.div
          layout
          onClick={() => setBig(!big())}
          class="cursor-pointer rounded-xl bg-green-500 shadow-lg"
          style={{
            width: big() ? "200px" : "100px",
            height: big() ? "200px" : "100px",
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
        />
      </div>
    </Animation>
  );
};

const ListDemo = () => {
  const [items, setItems] = createSignal([1, 2, 3, 4]);

  const shuffle = () => {
    setItems((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  return (
    <Animation name="List Reorder" class="h-[300px]">
      <div class="flex flex-col gap-2" onClick={shuffle}>
        <For each={items()}>
          {(item) => (
            <motion.div
              layout
              class="flex h-12 w-64 cursor-pointer items-center justify-center rounded-lg bg-orange-500 font-bold text-white shadow-sm"
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
            >
              Item {item}
            </motion.div>
          )}
        </For>
      </div>
    </Animation>
  );
};

const SharedLayoutDemo = () => {
  const [selected, setSelected] = createSignal(0);
  const items = [0, 1, 2];

  return (
    <Animation name="Shared Layout (Tabs)" class="h-[200px]">
      <div class="flex gap-4 rounded-xl bg-muted/20 p-2">
        <For each={items}>
          {(item) => (
            <div
              class="relative cursor-pointer px-4 py-2"
              onClick={() => setSelected(item)}
            >
              {selected() === item && (
                <motion.div
                  layoutId="tab-highlight"
                  class="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                />
              )}
              <span class="relative z-10 text-sm font-medium">
                Tab {item + 1}
              </span>
            </div>
          )}
        </For>
      </div>
    </Animation>
  );
};

const ScaleCorrectionDemo = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <Animation name="Scale Correction (Parent/Child)" class="h-[300px]">
      <div class="flex flex-col items-center gap-3">
        <motion.div
          layout
          onClick={() => setIsOpen(!isOpen())}
          class="flex cursor-pointer items-center justify-center overflow-hidden bg-purple-500 shadow-xl"
          style={{
            width: isOpen() ? "300px" : "100px",
            height: isOpen() ? "300px" : "100px",
            "border-radius": isOpen() ? "20px" : "50px",
          }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
          }}
        >
          <motion.div layout class="size-10 rounded-full bg-white shadow-md" />
        </motion.div>
      </div>
    </Animation>
  );
};
