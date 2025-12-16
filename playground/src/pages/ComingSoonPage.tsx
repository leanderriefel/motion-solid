import { Button } from "../components/Controls"

export function ComingSoonPage(props: { title: string; navigate: (route: string) => void }) {
  return (
    <div class="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm shadow-black/[0.03]">
      <div class="text-sm font-medium text-black/60">Planned feature</div>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-black/85">{props.title}</h1>
      <p class="mt-2 max-w-[80ch] text-sm leading-relaxed text-black/65">
        This feature is listed in the root README, but isn&apos;t implemented in this repo yet.
        The playground tracks it so you can see what&apos;s supported today and what&apos;s next.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => props.navigate("feature-matrix")}>
          Back to Feature Matrix
        </Button>
        <Button onClick={() => props.navigate("overview")}>Overview</Button>
      </div>
    </div>
  )
}
