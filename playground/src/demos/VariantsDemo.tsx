import { createMemo, createSignal } from "solid-js"
import { motion } from "motion-solid"
import { Button, Label, Slider, Toggle } from "../components/Controls"
import { CodeBlock } from "../components/CodeBlock"

export function VariantsDemo(_props: { navigate: (route: string) => void }) {
  const [active, setActive] = createSignal(true)
  const [distance, setDistance] = createSignal(180)
  const [inherit, setInherit] = createSignal(true)

  const parentVariants = createMemo(() => {
    return {
      rest: (custom: unknown) => ({
        x: `-${Math.max(40, (typeof custom === "number" ? custom : 0) / 2)}px`,
        opacity: 0.75,
        scale: 0.98,
      }),
      move: (custom: unknown) => ({
        x: `${typeof custom === "number" ? custom : 0}px`,
        opacity: 1,
        scale: 1.02,
      }),
    }
  })

  const code = `
import { createSignal } from "solid-js"
import { motion } from "motion-solid"

export function Example() {
  const [active, setActive] = createSignal(true)
  const [distance, setDistance] = createSignal(180)

  return (
    <motion.div
      variants={{
        rest: (custom: number) => ({ x: "-90px", opacity: 0.75, scale: 0.98 }),
        move: (custom: number) => ({ x: "\${custom}px", opacity: 1, scale: 1.02 }),
      }}
      transition={{ duration: 0.5 }}
      custom={distance()}
    >
      <motion.div
        animate={active() ? "move" : "rest"}
        // inherit defaults to true, so variants/custom/transition merge from the parent
      />
    </motion.div>
  )
}
`.trim()

  return (
    <div class="flex flex-col gap-4">
      <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
        <div class="text-sm font-medium text-black/60">motion components</div>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-black/85">
          Variants + inherit + custom
        </h1>
        <p class="mt-2 text-sm text-black/60">
          The child references variant labels defined on the parent (inherit defaults to true).
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="flex items-center justify-between">
            <Label title="State" hint={active() ? "move" : "rest"} />
            <Button variant="primary" onClick={() => setActive((v) => !v)}>
              Toggle
            </Button>
          </div>

          <div class="mt-5 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <Label title="Custom distance (px)" hint="Passed through variant functions" />
              <Slider value={distance()} min={60} max={320} step={5} onChange={setDistance} />
            </div>
            <div class="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/60 px-4 py-3">
              <Label title="inherit" hint="Toggle to break parent-to-child sharing" />
              <Toggle value={inherit()} onChange={setInherit} />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="text-sm font-medium text-black/70">Preview</div>
          <div class="mt-1 text-xs text-black/50">
            When inherit is off, the child can&apos;t resolve parent variants/custom.
          </div>

          <div class="mt-5 grid place-items-center rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.00))] p-8">
            <div class="relative h-28 w-full max-w-[520px] overflow-hidden rounded-2xl border border-black/10 bg-white">
              <motion.div
                class="absolute inset-0"
                variants={parentVariants()}
                custom={distance()}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  class="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black shadow-lg shadow-black/[0.12]"
                  animate={active() ? "move" : "rest"}
                  inherit={inherit()}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <CodeBlock language="tsx" code={code} />
    </div>
  )
}
