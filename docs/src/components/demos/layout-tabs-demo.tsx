import { For, Show, createMemo, createSignal } from "solid-js";
import { LayoutGroup, motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./layout-tabs-demo.tsx?raw";

const tabs = [
  { id: "alpha", label: "Alpha", width: 120, color: "#2563eb" },
  { id: "beta", label: "Beta", width: 180, color: "#16a34a" },
  { id: "gamma", label: "Gamma", width: 144, color: "#ea580c" },
] as const;

export const LayoutTabsDemo = () => {
  const [activeTab, setActiveTab] =
    createSignal<(typeof tabs)[number]["id"]>("alpha");

  const active = createMemo(
    () => tabs.find((tab) => tab.id === activeTab()) ?? tabs[0],
  );

  return (
    <Animation
      name="Layout"
      class="min-h-[260px]"
      wrapperClass="w-full p-4"
      source={source}
    >
      <LayoutGroup id="layout-tabs-demo">
        <div class="w-full">
          <div class="inline-flex rounded-2xl border border-border bg-muted p-1">
            <For each={tabs}>
              {(tab) => (
                <button
                  type="button"
                  class="relative px-4 py-2 text-sm font-medium"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Show when={activeTab() === tab.id}>
                    <motion.div
                      layoutId="tab-pill"
                      class="absolute inset-0 rounded-xl border border-border bg-card shadow-sm"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 30,
                      }}
                    />
                  </Show>
                  <span class="relative z-10">{tab.label}</span>
                </button>
              )}
            </For>
          </div>

          <motion.div
            layout
            class="mt-4 rounded-[28px] border border-border bg-card p-4"
            style={{ "border-radius": "28px" }}
          >
            <motion.div
              layout
              class="h-24 rounded-[20px]"
              style={{
                width: `${active().width}px`,
                "background-color": active().color,
                "border-radius": "20px",
              }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 28,
              }}
            />
          </motion.div>
        </div>
      </LayoutGroup>
    </Animation>
  );
};
