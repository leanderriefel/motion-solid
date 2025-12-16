import { For, createMemo, createSignal } from "solid-js"
import { motion } from "motion-solid"
import type { ViewportMargin } from "motion-solid"
import { Button, Label, Select, Toggle } from "../components/Controls"
import { CodeBlock } from "../components/CodeBlock"

type Amount = "some" | "all" | "0.25" | "0.5"

const amountToViewport = (amount: Amount): "some" | "all" | number =>
  amount === "0.25" ? 0.25 : amount === "0.5" ? 0.5 : amount

const marginTokenRe = /^-?\d+(?:\.\d+)?(px|%)$/

function normalizeViewportMargin(value: string): ViewportMargin | undefined {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0 || parts.length > 4) return undefined
  if (parts.some((part) => !marginTokenRe.test(part))) return undefined
  return parts.join(" ") as ViewportMargin
}

export function InViewDemo(_props: { navigate: (route: string) => void }) {
  const [once, setOnce] = createSignal(false)
  const [amount, setAmount] = createSignal<Amount>("some")
  const [margin, setMargin] = createSignal("0px 0px -20% 0px")
  const [log, setLog] = createSignal<string[]>([])

  const rootRef = { current: null as Element | null }

  const push = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 8))
  const viewportMargin = createMemo(() => normalizeViewportMargin(margin()))

  const viewport = createMemo(() => ({
    root: rootRef,
    once: once(),
    margin: viewportMargin(),
    amount: amountToViewport(amount()),
  }))

  const code = `
import { motion } from "motion-solid"

export function Example() {
  const rootRef = { current: null as Element | null }

  return (
    <div ref={(el) => (rootRef.current = el)}>
      <motion.div
        whileInView={{ opacity: 1, y: "0px" }}
        viewport={{ root: rootRef, margin: "0px 0px -20% 0px", amount: "some" }}
        onViewportEnter={() => console.log("enter")}
        onViewportLeave={() => console.log("leave")}
      />
    </div>
  )
}
`.trim()

  return (
    <div class="flex flex-col gap-4">
      <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
        <div class="text-sm font-medium text-black/60">gestures</div>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-black/85">
          whileInView + viewport
        </h1>
        <p class="mt-2 text-sm text-black/60">
          Scroll the container until the card enters/leaves view.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/60 px-4 py-3">
            <Label title="once" hint="If enabled, it will not reset on leave" />
            <Toggle value={once()} onChange={setOnce} />
          </div>

          <div class="mt-4 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <Label title="amount" hint="Intersection threshold" />
              <Select
                value={amount()}
                onChange={setAmount}
                options={[
                  { value: "some", label: "some" },
                  { value: "all", label: "all" },
                  { value: "0.25", label: "0.25" },
                  { value: "0.5", label: "0.5" },
                ]}
              />
            </div>

            <div class="flex flex-col gap-2">
              <Label title="margin" hint="IntersectionObserver rootMargin" />
              <input
                class="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm text-black/80 shadow-sm shadow-black/[0.03]"
                value={margin()}
                onInput={(e) => setMargin(e.currentTarget.value)}
              />
            </div>

            <div class="rounded-xl border border-black/10 bg-white/60 px-4 py-3">
              <div class="text-xs font-medium text-black/55">Event log</div>
              <div class="mt-2 flex flex-col gap-1">
                <For each={log()}>{(row) => <div class="text-xs text-black/70">{row}</div>}</For>
                {log().length === 0 ? <div class="text-xs text-black/45">—</div> : null}
              </div>
              <div class="mt-3">
                <Button class="h-8 px-2 py-0 text-xs" onClick={() => setLog([])}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="text-sm font-medium text-black/70">Preview</div>
          <div class="mt-3 text-xs text-black/50">Scroll inside the card below.</div>

          <div class="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div
              ref={(el) => (rootRef.current = el)}
              class="h-[420px] overflow-auto bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.00))] p-6"
            >
              <div class="h-64 rounded-xl border border-black/10 bg-white/70" />
              <div class="h-10" />
              <motion.div
                class="rounded-2xl border border-black/10 bg-white p-5 shadow-lg shadow-black/[0.08]"
                initial={{ opacity: 0.5, y: "24px" }}
                animate={{ opacity: 0.5, y: "24px" }}
                whileInView={{ opacity: 1, y: "0px" }}
                viewport={viewport()}
                transition={{ duration: 0.45 }}
                onViewportEnter={() => push("onViewportEnter")}
                onViewportLeave={() => push("onViewportLeave")}
              >
                <div class="text-sm font-semibold text-black/80">In-view card</div>
                <div class="mt-1 text-xs text-black/55">
                  Adjust margin / amount / once and scroll again.
                </div>
              </motion.div>
              <div class="h-96" />
            </div>
          </div>
        </div>
      </div>

      <CodeBlock language="tsx" code={code} />
    </div>
  )
}
