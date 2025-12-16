import { createMemo, createSignal } from "solid-js"
import { AnimatePresence, motion } from "motion-solid"
import { Button, Label, Select, Slider } from "../components/Controls"
import { CodeBlock } from "../components/CodeBlock"

type ExitDirection = "left" | "right" | "down"

export function PresenceDemo(_props: { navigate: (route: string) => void }) {
  const [open, setOpen] = createSignal(true)
  const [durationMs, setDurationMs] = createSignal(520)
  const [direction, setDirection] = createSignal<ExitDirection>("left")

  const exit = createMemo(() => {
    const dx = direction() === "left" ? "-140px" : direction() === "right" ? "140px" : "0px"
    const dy = direction() === "down" ? "120px" : "0px"
    return { opacity: 0, x: dx, y: dy, scale: 0.98 }
  })

  const code = `
import { createSignal } from "solid-js"
import { AnimatePresence, motion } from "motion-solid"

export function Example() {
  const [open, setOpen] = createSignal(true)

  return (
    <>
      <button onClick={() => setOpen((v) => !v)}>Toggle</button>
      <AnimatePresence when={open()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, x: "-140px" }}
          transition={{ duration: 0.52 }}
        />
      </AnimatePresence>
    </>
  )
}
`.trim()

  return (
    <div class="flex flex-col gap-4">
      <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
        <div class="text-sm font-medium text-black/60">presence</div>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-black/85">
          Presence / AnimatePresence + exit
        </h1>
        <p class="mt-2 text-sm text-black/60">
          Exit animations run when content leaves a presence boundary.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="flex items-center justify-between">
            <Label title="Visible" hint={open() ? "yes" : "no"} />
            <Button variant="primary" onClick={() => setOpen((v) => !v)}>
              Toggle
            </Button>
          </div>

          <div class="mt-5 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <Label title="Exit direction" />
              <Select
                value={direction()}
                onChange={setDirection}
                options={[
                  { value: "left", label: "Left" },
                  { value: "right", label: "Right" },
                  { value: "down", label: "Down" },
                ]}
              />
            </div>
            <div class="flex flex-col gap-2">
              <Label title="Duration (ms)" />
              <Slider value={durationMs()} min={120} max={1600} step={10} onChange={setDurationMs} />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="text-sm font-medium text-black/70">Preview</div>
          <div class="mt-1 text-xs text-black/50">Toggle to trigger exit.</div>

          <div class="mt-5 grid place-items-center rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.00))] p-10">
            <div class="relative grid h-44 w-full max-w-[520px] place-items-center overflow-hidden rounded-2xl border border-black/10 bg-white">
              <AnimatePresence when={open()}>
                <motion.div
                  class="flex h-24 w-72 items-center justify-between rounded-2xl border border-black/10 bg-white px-4 shadow-lg shadow-black/[0.10]"
                  initial={{ opacity: 0, scale: 0.98, y: "12px" }}
                  animate={{ opacity: 1, scale: 1, y: "0px" }}
                  exit={exit()}
                  transition={{ duration: durationMs() / 1000 }}
                >
                  <div>
                    <div class="text-sm font-semibold text-black/80">Presence card</div>
                    <div class="mt-1 text-xs text-black/55">Exits on toggle</div>
                  </div>
                  <div class="h-8 w-8 rounded-xl bg-black/10" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <CodeBlock language="tsx" code={code} />
    </div>
  )
}
