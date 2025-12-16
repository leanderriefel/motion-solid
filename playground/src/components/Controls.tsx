import type { JSX } from "solid-js"
import { cx } from "./cx"

export function Label(props: { title: string; hint?: string; class?: string }) {
  return (
    <div class={cx("flex flex-col gap-0.5", props.class)}>
      <div class="text-sm font-medium text-black/80">{props.title}</div>
      {props.hint ? <div class="text-xs text-black/55">{props.hint}</div> : null}
    </div>
  )
}

export function Button(
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }
) {
  const variant = props.variant ?? "secondary"
  return (
    <button
      {...props}
      class={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
        "border border-black/10 shadow-sm shadow-black/[0.03]",
        "active:translate-y-px disabled:opacity-50",
        variant === "primary"
          ? "bg-black text-white hover:bg-black/90"
          : "bg-white/70 text-black/80 hover:bg-white",
        props.class
      )}
    />
  )
}

export function Toggle(props: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      class={cx(
        "relative inline-flex h-7 w-12 items-center rounded-full border border-black/10",
        "bg-white/70 shadow-sm shadow-black/[0.03]"
      )}
      aria-pressed={props.value}
      onClick={() => props.onChange(!props.value)}
    >
      <span
        class={cx(
          "absolute left-1 top-1 size-5 rounded-full shadow-sm shadow-black/[0.08] transition-transform",
          props.value ? "translate-x-5 bg-black" : "translate-x-0 bg-white"
        )}
      />
    </button>
  )
}

export function Slider(props: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (next: number) => void
}) {
  return (
    <div class="flex items-center gap-3">
      <input
        type="range"
        class="h-2 w-full cursor-pointer appearance-none rounded-full bg-black/10 accent-black"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onInput={(e) => props.onChange(Number((e.target as HTMLInputElement).value))}
      />
      <div class="w-12 text-right text-xs tabular-nums text-black/60">{props.value}</div>
    </div>
  )
}

export function Select<T extends string>(props: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <select
      class="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm text-black/80 shadow-sm shadow-black/[0.03]"
      value={props.value}
      onChange={(e) => props.onChange((e.currentTarget.value as T) ?? props.value)}
    >
      {props.options.map((o) => (
        <option value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

