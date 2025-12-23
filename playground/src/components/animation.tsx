import { Show, createSignal, mergeProps } from "solid-js";
import type { Component, ComponentProps, JSX } from "solid-js";
import { motion } from "motion-solid";

export const Animation: Component<{
  children: JSX.Element;
  name?: string;
  class?: string;
  showReloadButton?: boolean;
  containerRef?: ComponentProps<"div">["ref"];
  scrollable?: boolean;
}> = (rawProps) => {
  const props = mergeProps({ scrollable: false }, rawProps);
  const [mounted, setMounted] = createSignal(true);

  const hasHeader = () =>
    Boolean(props.name) || Boolean(props.showReloadButton);

  return (
    <div
      ref={props.containerRef}
      class={`relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground ${
        hasHeader()
          ? "flex flex-col"
          : props.scrollable
            ? ""
            : "flex items-center justify-center"
      } ${props.class ?? ""}`}
    >
      <Show when={hasHeader()}>
        <div class="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/80 px-3 h-12 backdrop-blur">
          <Show when={props.name}>
            <span class="text-sm font-medium text-muted-foreground">
              {props.name}
            </span>
          </Show>
          <Show when={props.showReloadButton}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              type="button"
              class="ml-auto inline-flex shrink-0 items-center rounded-lg border border-border bg-card p-2 text-sm font-medium shadow-sm"
              onClick={() => {
                setMounted(false);
                queueMicrotask(() => setMounted(true));
              }}
              aria-label="Reload animation"
            >
              <ReloadIcon />
            </motion.button>
          </Show>
        </div>
      </Show>
      <Show when={mounted()}>
        <div
          class={
            props.scrollable
              ? "px-3 pb-3"
              : hasHeader()
                ? "flex flex-1 items-center justify-center p-6"
                : ""
          }
        >
          {props.children}
        </div>
      </Show>
    </div>
  );
};

const ReloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v7h-7" />
  </svg>
);
