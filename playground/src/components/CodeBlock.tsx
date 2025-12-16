import { createSignal, type JSX } from "solid-js"
import { cx } from "./cx"

type CodeBlockProps = {
  code: string
  class?: string
  language?: string
}

export function CodeBlock(props: CodeBlockProps): JSX.Element {
  const [copied, setCopied] = createSignal(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.code.trimEnd() + "\n")
      setCopied(true)
      window.setTimeout(() => setCopied(false), 900)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div class={cx("relative overflow-hidden rounded-xl border border-black/10", props.class)}>
      <div class="flex items-center justify-between gap-3 border-b border-black/10 bg-black/[0.02] px-3 py-2">
        <div class="text-xs font-medium tracking-wide text-black/60">
          {props.language ?? "code"}
        </div>
        <button
          type="button"
          class={cx(
            "rounded-md px-2 py-1 text-xs font-medium",
            "border border-black/10 bg-white/60 hover:bg-white",
            "active:translate-y-px",
            copied() ? "text-emerald-700" : "text-black/70"
          )}
          onClick={copy}
        >
          {copied() ? "Copied" : "Copy"}
        </button>
      </div>
      <pre class="max-h-[420px] overflow-auto bg-white px-4 py-3 text-[12.5px] leading-relaxed text-black/80">
        <code>{props.code.trimEnd()}</code>
      </pre>
    </div>
  )
}

