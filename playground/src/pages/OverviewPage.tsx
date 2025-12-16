import { createMemo, type JSX } from "solid-js"
import { featureGroups } from "../features"
import { Button } from "../components/Controls"

export function OverviewPage(props: { navigate: (route: string) => void }): JSX.Element {
  const totals = createMemo(() => {
    const all = featureGroups.flatMap((g) => g.features)
    const supported = all.filter((f) => f.status === "supported")
    const planned = all.filter((f) => f.status === "planned")
    return { all: all.length, supported: supported.length, planned: planned.length }
  })

  const demoLinks: Array<{ route: string; title: string; description: string }> = [
    { route: "basics", title: "Basics", description: "initial / animate / transition" },
    { route: "presence", title: "Presence", description: "Presence + exit animations" },
    { route: "variants", title: "Variants", description: "variants + inherit + custom" },
    { route: "hover-tap", title: "Hover + Tap", description: "whileHover / whileTap + events" },
    { route: "in-view", title: "In View", description: "whileInView + viewport options" },
    { route: "events", title: "Events", description: "onUpdate / start / complete" },
  ]

  return (
    <div class="flex flex-col gap-6">
      <div class="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm shadow-black/[0.03]">
        <div class="flex flex-col gap-2">
          <div class="text-sm font-medium text-black/60">motion-solid playground</div>
          <h1 class="text-2xl font-semibold tracking-tight text-black/85">
            A clean, interactive playground for motion-solid
          </h1>
          <p class="max-w-[74ch] text-sm leading-relaxed text-black/65">
            Browse features from the root README as a matrix, then open interactive demos for
            everything currently implemented.
          </p>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-black/10 bg-white/60 px-4 py-3">
            <div class="text-xs font-medium text-black/55">Supported</div>
            <div class="mt-1 text-2xl font-semibold tabular-nums text-black/85">
              {totals().supported}
            </div>
          </div>
          <div class="rounded-xl border border-black/10 bg-white/60 px-4 py-3">
            <div class="text-xs font-medium text-black/55">Planned</div>
            <div class="mt-1 text-2xl font-semibold tabular-nums text-black/85">
              {totals().planned}
            </div>
          </div>
          <div class="rounded-xl border border-black/10 bg-white/60 px-4 py-3">
            <div class="text-xs font-medium text-black/55">Total</div>
            <div class="mt-1 text-2xl font-semibold tabular-nums text-black/85">
              {totals().all}
            </div>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => props.navigate("feature-matrix")}>
            Open Feature Matrix
          </Button>
          <Button onClick={() => props.navigate("basics")}>Open Basics Demo</Button>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        {demoLinks.map((d) => (
          <button
            type="button"
            class="group rounded-2xl border border-black/10 bg-white/70 p-5 text-left shadow-sm shadow-black/[0.03] transition hover:bg-white"
            onClick={() => props.navigate(d.route)}
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-base font-semibold text-black/85">{d.title}</div>
                <div class="mt-1 text-sm text-black/60">{d.description}</div>
              </div>
              <div class="mt-0.5 text-sm font-medium text-black/40 transition group-hover:text-black/55">
                Open →
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

