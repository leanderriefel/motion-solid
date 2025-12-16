import { For, Show, createMemo, createSignal, type JSX } from "solid-js"
import { featureGroups, type Feature, type FeatureStatus } from "../features"
import { Button } from "../components/Controls"
import { cx } from "../components/cx"

function StatusChip(props: { status: FeatureStatus }) {
  return (
    <span
      class={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        props.status === "supported"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      )}
    >
      {props.status}
    </span>
  )
}

function FeatureRow(props: { feature: Feature; navigate: (route: string) => void }) {
  return (
    <div class="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/60 px-4 py-3">
      <div class="min-w-0">
        <div class="truncate text-sm font-medium text-black/85">{props.feature.label}</div>
        <div class="mt-0.5 truncate text-xs text-black/50">{props.feature.id}</div>
      </div>
      <div class="flex items-center gap-2">
        <StatusChip status={props.feature.status} />
        <Show when={props.feature.demoRoute}>
          {(route) => (
            <Button
              class="h-8 px-2 py-0 text-xs"
              onClick={() => props.navigate(route())}
              disabled={props.feature.status !== "supported"}
            >
              Demo
            </Button>
          )}
        </Show>
      </div>
    </div>
  )
}

export function FeatureMatrixPage(props: { navigate: (route: string) => void }): JSX.Element {
  const [query, setQuery] = createSignal("")
  const [filter, setFilter] = createSignal<"all" | FeatureStatus>("all")

  const groups = createMemo(() => {
    const q = query().trim().toLowerCase()
    const f = filter()

    return featureGroups
      .map((g) => {
        const features = g.features.filter((feat) => {
          if (f !== "all" && feat.status !== f) return false
          if (!q) return true
          return feat.label.toLowerCase().includes(q) || feat.id.toLowerCase().includes(q)
        })
        return { ...g, features }
      })
      .filter((g) => g.features.length > 0)
  })

  const totals = createMemo(() => {
    const all = featureGroups.flatMap((g) => g.features)
    return {
      supported: all.filter((f) => f.status === "supported").length,
      planned: all.filter((f) => f.status === "planned").length,
    }
  })

  return (
    <div class="flex flex-col gap-4">
      <div class="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm shadow-black/[0.03]">
        <div class="flex flex-col gap-1">
          <div class="text-sm font-medium text-black/60">Root README</div>
          <h1 class="text-2xl font-semibold tracking-tight text-black/85">Feature Matrix</h1>
          <p class="mt-1 text-sm text-black/60">
            Supported: {totals().supported} · Planned: {totals().planned}
          </p>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-3">
          <div class="md:col-span-2">
            <input
              class="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-black/80 shadow-sm shadow-black/[0.03] outline-none focus:border-black/20"
              placeholder="Search features…"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
          </div>
          <div class="flex gap-2">
            <Button
              class={cx("w-full", filter() === "all" && "bg-black text-white hover:bg-black/90")}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              class={cx(
                "w-full",
                filter() === "supported" && "bg-black text-white hover:bg-black/90"
              )}
              onClick={() => setFilter("supported")}
            >
              Supported
            </Button>
            <Button
              class={cx(
                "w-full",
                filter() === "planned" && "bg-black text-white hover:bg-black/90"
              )}
              onClick={() => setFilter("planned")}
            >
              Planned
            </Button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-6">
        <For each={groups()}>
          {(g) => (
            <section class="flex flex-col gap-3">
              <div class="flex items-baseline justify-between gap-3">
                <h2 class="text-lg font-semibold text-black/80">{g.label}</h2>
                <div class="text-xs text-black/50">{g.features.length} items</div>
              </div>
              <div class="grid gap-2 lg:grid-cols-2">
                <For each={g.features}>
                  {(feat) => <FeatureRow feature={feat} navigate={props.navigate} />}
                </For>
              </div>
            </section>
          )}
        </For>
      </div>
    </div>
  )
}

