import { createMemo, createSignal } from "solid-js"
import { motion } from "motion-solid"
import { Button, Label, Slider } from "../components/Controls"
import { CodeBlock } from "../components/CodeBlock"

export function BasicsDemo(props: { navigate: (route: string) => void }) {
  const [on, setOn] = createSignal(true)
  const [durationMs, setDurationMs] = createSignal(450)
  const [distance, setDistance] = createSignal(140)
  const [rotate, setRotate] = createSignal(10)

  const variants = createMemo(() => {
    const dx = `${distance()}px`
    const rot = `${rotate()}deg`
    return {
      off: { opacity: 0.6, x: `-${dx}`, rotate: `-${rot}`, scale: 0.96 },
      on: { opacity: 1, x: dx, rotate: rot, scale: 1.02 },
    } as const
  })

  const transition = createMemo(() => ({ duration: durationMs() / 1000 }))

  const code = `
import { createSignal } from "solid-js"
import { motion } from "motion-solid"

export function Example() {
  const [on, setOn] = createSignal(true)

  return (
    <>
      <button onClick={() => setOn((v) => !v)}>Toggle</button>
      <motion.div
        class="h-16 w-16 rounded-xl bg-black"
        variants={{
          off: { opacity: 0.6, x: "-140px", rotate: "-10deg", scale: 0.96 },
          on: { opacity: 1, x: "140px", rotate: "10deg", scale: 1.02 },
        }}
        initial="off"
        animate={on() ? "on" : "off"}
        transition={{ duration: 0.45 }}
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
          Basics: initial / animate / transition
        </h1>
        <p class="mt-2 text-sm text-black/60">
          Toggle the state and tweak duration, distance, and rotation.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="flex items-center justify-between">
            <Label title="State" hint={on() ? "on" : "off"} />
            <Button variant="primary" onClick={() => setOn((v) => !v)}>
              Toggle
            </Button>
          </div>

          <div class="mt-5 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <Label title="Duration (ms)" />
              <Slider value={durationMs()} min={120} max={1200} step={10} onChange={setDurationMs} />
            </div>
            <div class="flex flex-col gap-2">
              <Label title="Distance (px)" />
              <Slider value={distance()} min={40} max={260} step={5} onChange={setDistance} />
            </div>
            <div class="flex flex-col gap-2">
              <Label title="Rotation (deg)" />
              <Slider value={rotate()} min={0} max={40} step={1} onChange={setRotate} />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-black/70">Preview</div>
              <div class="mt-1 text-xs text-black/50">
                The square animates between variants.
              </div>
            </div>
            <Button onClick={() => props.navigate("feature-matrix")}>Matrix</Button>
          </div>

          <div class="mt-5 grid place-items-center rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.00))] p-8">
            <div class="relative h-28 w-full max-w-[520px] overflow-hidden rounded-2xl border border-black/10 bg-white">
              <div class="absolute inset-0 grid place-items-center">
                <motion.div
                  class="size-16 rounded-2xl bg-black shadow-lg shadow-black/[0.12]"
                  variants={variants()}
                  initial="off"
                  animate={on() ? "on" : "off"}
                  transition={transition()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <CodeBlock language="tsx" code={code} />
    </div>
  )
}

