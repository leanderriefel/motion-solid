import {
  JSX,
  Show,
  Suspense,
  createResource,
  createSignal,
  onMount,
} from "solid-js";
import { codeToHtml } from "shiki";
import { useColorMode } from "@kobalte/core";

type CodeBlockProps = {
  children?: JSX.Element;
};

type HighlightPayload = {
  code: string;
  language: string;
};

const getLanguageFromClass = (className: string) => {
  const match = /language-([a-z0-9-]+)/i.exec(className);
  return match ? match[1] : "text";
};

export const CodeBlock = (props: CodeBlockProps) => {
  // oxlint-disable-next-line no-unassigned-vars
  let preRef!: HTMLPreElement;
  const [payload, setPayload] = createSignal<HighlightPayload | null>(null);

  const { colorMode } = useColorMode();

  onMount(() => {
    const codeElement = preRef?.querySelector("code");
    const className =
      codeElement?.getAttribute("class") ?? codeElement?.className ?? "";
    const code = (
      codeElement?.textContent ??
      preRef?.textContent ??
      ""
    ).replace(/\n$/, "");

    if (!code) return;
    setPayload({ code, language: getLanguageFromClass(className) });
  });

  const [highlighted] = createResource(
    () => ({ payload: payload(), colorMode: colorMode() }),
    async ({ payload: value, colorMode }) => {
      if (!value?.code) return null;
      try {
        return await codeToHtml(value.code, {
          lang: value.language,
          theme: colorMode === "dark" ? "github-dark" : "github-light",
        });
      } catch {
        return await codeToHtml(value.code, {
          lang: "text",
          theme: colorMode === "dark" ? "github-dark" : "github-light",
        });
      }
    },
  );

  const renderFallback = () => (
    <pre
      ref={preRef}
      class="p-4 text-xs font-mono leading-relaxed text-foreground"
    >
      {props.children}
    </pre>
  );

  const highlightedHtml = () => highlighted.latest;

  return (
    <div class="not-prose my-4 overflow-hidden rounded-lg border border-border bg-card">
      <Suspense fallback={renderFallback()}>
        <Show when={highlightedHtml()} fallback={renderFallback()}>
          {(value) => (
            <div
              innerHTML={value()}
              class="p-4 text-xs font-mono leading-relaxed [&>pre]:bg-transparent! [&>pre]:m-0!"
            />
          )}
        </Show>
      </Suspense>
    </div>
  );
};
