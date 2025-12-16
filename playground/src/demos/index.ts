import type { Component } from "solid-js"
import { BasicsDemo } from "./BasicsDemo"
import { PresenceDemo } from "./PresenceDemo"
import { VariantsDemo } from "./VariantsDemo"
import { StyleDemo } from "./StyleDemo"
import { EventsDemo } from "./EventsDemo"
import { HoverTapDemo } from "./HoverTapDemo"
import { InViewDemo } from "./InViewDemo"

export type Demo = {
  id: string
  title: string
  description: string
  Component: Component<{ navigate: (route: string) => void }>
}

export const demos: Demo[] = [
  { id: "basics", title: "Basics", description: "initial / animate / transition", Component: BasicsDemo },
  { id: "presence", title: "Presence", description: "Presence + exit animations", Component: PresenceDemo },
  { id: "variants", title: "Variants", description: "variants / inherit / custom", Component: VariantsDemo },
  { id: "style", title: "Style", description: "style prop", Component: StyleDemo },
  { id: "events", title: "Events", description: "onUpdate / start / complete", Component: EventsDemo },
  { id: "hover-tap", title: "Hover + Tap", description: "whileHover / whileTap", Component: HoverTapDemo },
  { id: "in-view", title: "In View", description: "whileInView / viewport", Component: InViewDemo },
]

export const demosById: Record<string, Demo> = Object.fromEntries(demos.map((d) => [d.id, d]))
