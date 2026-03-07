import { For, Show, createSignal } from "solid-js";
import { LayoutGroup, motion } from "motion-solid";
import { Animation } from "./animation";
import source from "./simple-layout-animation.tsx?raw";

const tabs = [
  {
    id: "overview",
    label: "Overview",
    body: "Shared layout underline transitions between tabs with a single layoutId.",
  },
  {
    id: "activity",
    label: "Activity",
    body: "This is the minimal shared layout pattern people usually reach for first.",
  },
  {
    id: "settings",
    label: "Settings",
    body: "The underline keeps one DOM shape and hands off position across siblings.",
  },
] as const;

export const SimpleLayoutAnimation = () => {
  const [activeTab, setActiveTab] =
    createSignal<(typeof tabs)[number]["id"]>("overview");

  return (
    <Animation
      name="Underline Layout Animation"
      class="min-h-[260px]"
      wrapperClass="w-full p-4"
      source={source}
    >
      <LayoutGroup id="underline-demo">
        <div class="w-full">
          <div class="border-b border-border">
            <div class="flex gap-6">
              <For each={tabs}>
                {(tab) => (
                  <button
                    type="button"
                    class="relative pb-3 text-sm font-medium text-muted-foreground transition-colors"
                    classList={{ "text-foreground": activeTab() === tab.id }}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                    <Show when={activeTab() === tab.id}>
                      <motion.div
                        layoutId="underline"
                        class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </div>

          <motion.div
            layout
            class="mt-4 rounded-3xl border border-border bg-card p-4 shadow-sm"
          >
            <p class="text-sm font-medium text-foreground">
              {tabs.find((tab) => tab.id === activeTab())?.label}
            </p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              {tabs.find((tab) => tab.id === activeTab())?.body}
            </p>
          </motion.div>
        </div>
      </LayoutGroup>
    </Animation>
  );
};
