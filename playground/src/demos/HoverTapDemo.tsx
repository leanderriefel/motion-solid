import { For, createSignal } from "solid-js"
import { motion } from "motion-solid"
import { Label, Toggle } from "../components/Controls"
import { CodeBlock } from "../components/CodeBlock"

export function HoverTapDemo(_props: { navigate: (route: string) => void }) {
  const [globalTapTarget, setGlobalTapTarget] = createSignal(true)
  const [log, setLog] = createSignal<string[]>([])

  const push = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 8))

  const code = `
import { motion } from "motion-solid"

export function Example() {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      onHoverStart={(e, info) => console.log("hover start", info.point)}
      onHoverEnd={(e, info) => console.log("hover end", info.point)}
      whileTap={{ scale: 0.96 }}
      onTapStart={(e, info) => console.log("tap start", info.point)}
      onTap={() => console.log("tap")}
      onTapCancel={() => console.log("tap cancel")}
      globalTapTarget
    >
      Interact
    </motion.button>
  )
}
`.trim()

  return (
    <div class="flex flex-col gap-4">
      <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
        <div class="text-sm font-medium text-black/60">gestures</div>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-black/85">
          whileHover / whileTap + gesture events
        </h1>
        <p class="mt-2 text-sm text-black/60">
          Hover, press, drag off, and release to see onTapCancel.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/60 px-4 py-3">
            <Label
              title="globalTapTarget"
              hint="Uses a global pointer target for more robust press tracking"
            />
            <Toggle value={globalTapTarget()} onChange={setGlobalTapTarget} />
          </div>

          <div class="mt-4 rounded-xl border border-black/10 bg-white/60 px-4 py-3">
            <div class="text-xs font-medium text-black/55">Event log</div>
            <div class="mt-2 flex flex-col gap-1">
              <For each={log()}>{(row) => <div class="text-xs text-black/70">{row}</div>}</For>
              {log().length === 0 ? <div class="text-xs text-black/45">—</div> : null}
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
          <div class="text-sm font-medium text-black/70">Preview</div>
          <div class="mt-5 grid place-items-center rounded-2xl border border-black/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.00))] p-10">
            <div class="grid w-full max-w-[520px] gap-4 sm:grid-cols-2">
              <motion.button
                class="h-16 w-full select-none rounded-2xl bg-black text-sm font-semibold text-white shadow-lg shadow-black/[0.12]"
                whileHover={{ y: "-4px", scale: 1.06 }}
                onHoverStart={(_e, info) =>
                  push(`onHoverStart (${Math.round(info.point.x)}, ${Math.round(info.point.y)})`)
                }
                onHoverEnd={(_e, info) =>
                  push(`onHoverEnd (${Math.round(info.point.x)}, ${Math.round(info.point.y)})`)
                }
              >
                Hover me
              </motion.button>

              <motion.button
                class="h-16 w-full select-none rounded-2xl bg-white text-sm font-semibold text-black/80 shadow-lg shadow-black/[0.08] ring-1 ring-black/10"
                whileTap={{ scale: 0.96 }}
                onTapStart={(_e, info) => push(`onTapStart (${Math.round(info.point.x)}, ${Math.round(info.point.y)})`)}
                onTap={() => push("onTap")}
                onTapCancel={() => push("onTapCancel")}
                globalTapTarget={globalTapTarget()}
              >
                Tap (drag off to cancel)
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <CodeBlock language="tsx" code={code} />
    </div>
  )
}
