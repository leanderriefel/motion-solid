import { Show, createSignal, mergeProps, createResource } from "solid-js";
import type { Component, ComponentProps, JSX } from "solid-js";
import { Portal, isServer } from "solid-js/web";
import { AnimatePresence, motion } from "motion-solid";
import { codeToHtml } from "shiki";
import { cn } from "../../utils/cn";

export const Animation: Component<{
  children: JSX.Element;
  name?: string;
  source?: string;
  class?: string;
  showReloadButton?: boolean;
  containerRef?: ComponentProps<"div">["ref"];
  scrollable?: boolean;
}> = (rawProps) => {
  const props = mergeProps({ scrollable: false }, rawProps);
  const [mounted, setMounted] = createSignal(true);
  const [showSource, setShowSource] = createSignal(false);

  const [highlightedCode] = createResource(
    () => (isServer ? null : props.source),
    async (source) => {
      if (!source) return null;
      try {
        return await codeToHtml(source, {
          lang: "tsx",
          theme: "github-dark",
        });
      } catch {
        return null;
      }
    },
  );

  const hasHeader = () =>
    Boolean(props.name) ||
    Boolean(props.showReloadButton) ||
    Boolean(props.source);

  return (
    <div
      ref={props.containerRef}
      class={cn(
        "not-prose relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground",
        {
          "flex flex-col": hasHeader(),
          "flex items-center justify-center": !props.scrollable && !hasHeader(),
        },
        props.class,
      )}
    >
      <Show when={hasHeader()}>
        <div class="sticky top-0 z-20 shrink-0 flex items-center gap-3 border-b border-border bg-card px-3 h-12 backdrop-blur">
          <Show when={props.name}>
            <h3 class="text-sm font-medium text-muted-foreground">
              {props.name}
            </h3>
          </Show>
          <div class="ml-auto flex items-center gap-2">
            <Show when={props.source}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
                type="button"
                class="inline-flex shrink-0 items-center rounded-lg border border-border bg-card p-2 text-sm font-medium shadow-sm"
                onClick={() => setShowSource(true)}
                aria-label="View source"
              >
                <CodeIcon />
              </motion.button>
            </Show>
            <Show when={props.showReloadButton}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
                type="button"
                class="inline-flex shrink-0 items-center rounded-lg border border-border bg-card p-2 text-sm font-medium shadow-sm"
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
        </div>
      </Show>
      <Show when={mounted()}>
        <div
          class={cn({
            "px-3 pb-3": props.scrollable,
            "flex flex-1 items-center justify-center p-6": !props.scrollable,
          })}
        >
          {props.children}
        </div>
      </Show>

      <Portal>
        <AnimatePresence>
          <Show when={showSource()}>
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                class="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowSource(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                class="relative w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              >
                <div class="flex items-center justify-between border-b border-border px-4 py-3 bg-card">
                  <span class="text-sm font-medium">Source Code</span>
                  <button
                    type="button"
                    class="rounded-md p-1 hover:bg-muted transition-colors"
                    onClick={() => setShowSource(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
                <div class="flex-1 overflow-auto bg-[#0d1117]">
                  <Show
                    when={highlightedCode()}
                    fallback={
                      <pre class="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto text-foreground">
                        {props.source}
                      </pre>
                    }
                  >
                    <div
                      innerHTML={highlightedCode()!}
                      class="p-4 text-xs font-mono leading-relaxed [&>pre]:bg-transparent! [&>pre]:m-0!"
                    />
                  </Show>
                </div>
              </motion.div>
            </div>
          </Show>
        </AnimatePresence>
      </Portal>
    </div>
  );
};

const CodeIcon = () => (
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
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

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
