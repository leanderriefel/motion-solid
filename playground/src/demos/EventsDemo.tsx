import { For, createMemo, createSignal } from "solid-js"
import { motion } from "motion-solid"
import { Button, Label, Slider } from "../components/Controls"
import { CodeBlock } from "../components/CodeBlock"

function formatTime(ts: number) {
  const d = new Date(ts)
  return (
    d.toLocaleTimeString(undefined, { hour12: false }) +
    "." +
    String(d.getMilliseconds()).padStart(3, "0")
  )
}

export function EventsDemo(_props: { navigate: (route: string) => void }) {
  const [durationMs, setDurationMs] = createSignal(520)
  const [run, setRun] = createSignal(0)
  const [latest, setLatest] = createSignal<Record<string, unknown> | null>(null)
  const [log, setLog] = createSignal<Array<{ ts: number; msg: string }>>([])

  const target = createMemo(() => {
    run()
    const x = 60 + Math.round(Math.random() * 260)
    const r = Math.round(Math.random() * 18) - 9
    const o = 0.8 + Math.random() * 0.2
    return {
      x: `${x}px`,
      rotate: `${r}deg`,
      opacity: o,
      backgroundColor: `rgba(0,0,0,${0.72 + Math.random() * 0.16})`,
    }
  })

  const push = (msg: string) =>
    setLog((prev) => [{ ts: Date.now(), msg }, ...prev].slice(0, 10))

  const code = `
import { createSignal } from "solid-js"
import { motion } from "motion-solid"

export function Example() {
  const [run, setRun] = createSignal(0)
  const target = () => (run(), { x: "180px", rotate: "8deg" })

  return (
    <>
      <button onClick={() => setRun((v) => v + 1)}>Run</button>
      <motion.div
        animate={target()}
        onAnimationStart={() => console.log("start")}
        onUpdate={(latest) => console.log(latest)}
        onAnimationComplete={() => console.log("complete")}
      />
    </>
  )
}
`.trim()

  return (
    <div class="flex flex-col gap-4">
      <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
        <div class="text-sm font-medium text-black/60">motion components</div>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-black/85">
          onUpdate / onAnimationStart / onAnimationComplete
        </h1>
        <p class="mt-2 text-sm text-black/60">
          Trigger new targets and inspect callback output.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="flex items-center justify-between gap-3">
            <Label title="Controls" hint="Run generates a new random target" />
            <Button variant="primary" onClick={() => setRun((v) => v + 1)}>
              Run
            </Button>
          </div>

          <div class="mt-5 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <Label title="Duration (ms)" />
              <Slider value={durationMs()} min={120} max={1600} step={10} onChange={setDurationMs} />
            </div>
            <div class="rounded-xl border border-black/10 bg-white/60 px-4 py-3">
              <div class="text-xs font-medium text-black/55">Latest values</div>
              <pre class="mt-2 max-h-40 overflow-auto text-[12px] leading-relaxed text-black/70">
                <code>{latest() ? JSON.stringify(latest(), null, 2) : "—"}</code>
              </pre>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="text-sm font-medium text-black/70">Preview</div>
          <div class="mt-5 grid place-items-center rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.00))] p-10">
            <div class="relative h-28 w-full max-w-[520px] overflow-hidden rounded-2xl border border-black/10 bg-white">
              <div class="absolute inset-0 grid place-items-center">
                <motion.div
                  class="size-16 rounded-2xl shadow-lg shadow-black/[0.12]"
                  initial={{ opacity: 1, x: "0px", rotate: "0deg", backgroundColor: "rgba(0,0,0,0.8)" }}
                  animate={target()}
                  transition={{ duration: durationMs() / 1000 }}
                  onAnimationStart={() => push("onAnimationStart")}
                  onUpdate={setLatest}
                  onAnimationComplete={() => push("onAnimationComplete")}
                />
              </div>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-black/10 bg-white/60 px-4 py-3">
            <div class="text-xs font-medium text-black/55">Event log</div>
            <div class="mt-2 flex flex-col gap-1">
              <For each={log()}>
                {(row) => (
                  <div class="flex items-baseline justify-between gap-3 text-xs text-black/65">
                    <div class="font-medium text-black/70">{row.msg}</div>
                    <div class="tabular-nums text-black/45">{formatTime(row.ts)}</div>
                  </div>
                )}
              </For>
              {log().length === 0 ? <div class="text-xs text-black/45">—</div> : null}
            </div>
          </div>
        </div>
      </div>

      <CodeBlock language="tsx" code={code} />
    </div>
  )
}
