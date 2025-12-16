import { createMemo, createSignal } from "solid-js"
import { motion } from "motion-solid"
import { Button, Label, Slider } from "../components/Controls"
import { CodeBlock } from "../components/CodeBlock"

export function StyleDemo(_props: { navigate: (route: string) => void }) {
  const [pulse, setPulse] = createSignal(true)
  const [radius, setRadius] = createSignal(18)
  const [border, setBorder] = createSignal(10)
  const [durationMs, setDurationMs] = createSignal(520)

  const staticStyle = createMemo(() => ({
    borderRadius: `${radius()}px`,
    border: `${border()}px solid rgba(0,0,0,0.10)`,
  }))

  const animateTarget = createMemo(() =>
    pulse()
      ? { scale: 1.02, rotate: "2deg", backgroundColor: "rgba(0,0,0,0.86)" }
      : { scale: 0.98, rotate: "-2deg", backgroundColor: "rgba(0,0,0,0.72)" }
  )

  const code = `
import { createSignal } from "solid-js"
import { motion } from "motion-solid"

export function Example() {
  const [pulse, setPulse] = createSignal(true)

  return (
    <>
      <button onClick={() => setPulse((v) => !v)}>Toggle</button>
      <motion.div
        style={{ borderRadius: "18px", border: "10px solid rgba(0,0,0,0.10)" }}
        animate={
          pulse()
            ? { scale: 1.02, rotate: "2deg", backgroundColor: "rgba(0,0,0,0.86)" }
            : { scale: 0.98, rotate: "-2deg", backgroundColor: "rgba(0,0,0,0.72)" }
        }
        transition={{ duration: 0.52 }}
      />
    </>
  )
}
`.trim()

  return (
    <div class="flex flex-col gap-4">
      <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
        <div class="text-sm font-medium text-black/60">motion components</div>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-black/85">style prop</h1>
        <p class="mt-2 text-sm text-black/60">
          Static styles apply immediately; motion-driven styles animate over time.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="flex items-center justify-between">
            <Label title="State" hint={pulse() ? "pulse" : "rest"} />
            <Button variant="primary" onClick={() => setPulse((v) => !v)}>
              Toggle
            </Button>
          </div>

          <div class="mt-5 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <Label title="Border radius (px)" />
              <Slider value={radius()} min={0} max={44} step={1} onChange={setRadius} />
            </div>
            <div class="flex flex-col gap-2">
              <Label title="Border width (px)" />
              <Slider value={border()} min={0} max={18} step={1} onChange={setBorder} />
            </div>
            <div class="flex flex-col gap-2">
              <Label title="Duration (ms)" />
              <Slider value={durationMs()} min={120} max={1400} step={10} onChange={setDurationMs} />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="text-sm font-medium text-black/70">Preview</div>
          <div class="mt-5 grid place-items-center rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.00))] p-10">
            <motion.div
              class="h-28 w-80 shadow-lg shadow-black/[0.10]"
              style={staticStyle()}
              animate={animateTarget()}
              transition={{ duration: durationMs() / 1000 }}
            />
          </div>
        </div>
      </div>

      <CodeBlock language="tsx" code={code} />
    </div>
  )
}
