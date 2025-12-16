import { For, Show, children, createContext, createEffect, createMemo, createSignal, onCleanup, useContext } from "solid-js"
import type { JSX } from "solid-js"

export interface PresenceContextValue {
  isPresent: () => boolean
  register: (onExitComplete: () => void) => () => void
  onExitComplete: (callback: () => void) => void
}

const PresenceContext = createContext<PresenceContextValue | null>(null)

type Key = string | number

interface PresenceChildProps {
  keyValue: Key
  isPresent: boolean
  onExitComplete: (key: Key) => void
  children: JSX.Element
}

function PresenceChild(props: PresenceChildProps) {
  const callbacks = new Set<() => void>()
  const [mounted, setMounted] = createSignal(true)
  const [present, setPresent] = createSignal(props.isPresent)

  createEffect(() => {
    setPresent(props.isPresent)
    if (props.isPresent) setMounted(true)
    if (!props.isPresent && callbacks.size === 0) {
      setMounted(false)
      props.onExitComplete(props.keyValue)
    }
  })

  const context: PresenceContextValue = {
    isPresent: present,
    register: (onExitComplete) => {
      callbacks.add(onExitComplete)
      return () => callbacks.delete(onExitComplete)
    },
    onExitComplete: (callback) => {
      callbacks.delete(callback)
      if (!present() && callbacks.size === 0) {
        setMounted(false)
        props.onExitComplete(props.keyValue)
      }
    }
  }

  onCleanup(() => callbacks.clear())

  return (
    <PresenceContext.Provider value={context}>
      <Show when={mounted()}>{props.children}</Show>
    </PresenceContext.Provider>
  )
}

export interface AnimatePresenceProps {
  children: JSX.Element
  /** called when all exiting nodes have completed */
  onExitComplete?: () => void
}

interface TrackedChild {
  key: Key
  element: JSX.Element
  isPresent: boolean
}

function toChildArray(nodes: JSX.Element | JSX.Element[] | undefined): JSX.Element[] {
  if (nodes === undefined || nodes === null) return []
  return Array.isArray(nodes) ? nodes : [nodes]
}

function getChildKey(child: JSX.Element, index: number): Key {
  const maybeKey = (child as { key?: Key } | undefined)?.key
  return maybeKey ?? index
}

export function AnimatePresence(props: AnimatePresenceProps) {
  const resolved = children(() => props.children)
  const [presentChildren, setPresentChildren] = createSignal<TrackedChild[]>(() => {
    const initial = toChildArray(resolved())
    return initial.map((element, index) => ({ key: getChildKey(element, index), element, isPresent: true }))
  }())

  createEffect(() => {
    const next = toChildArray(resolved())
    const nextKeys = new Set<Key>()
    const nextChildren: TrackedChild[] = []

    next.forEach((element, index) => {
      const key = getChildKey(element, index)
      nextKeys.add(key)
      const existing = presentChildren().find((child) => child.key === key)
      nextChildren.push({ key, element, isPresent: true, ...(existing ? { isPresent: true } : {}) })
    })

    const exiting = presentChildren()
      .filter((child) => !nextKeys.has(child.key))
      .map((child) => ({ ...child, isPresent: false }))

    setPresentChildren([...nextChildren, ...exiting])
  })

  const handleExitComplete = (key: Key) => {
    setPresentChildren((existing) => existing.filter((child) => child.key !== key || child.isPresent))
    queueMicrotask(() => {
      const anyExiting = presentChildren().some((child) => !child.isPresent)
      if (!anyExiting) props.onExitComplete?.()
    })
  }

  const rendered = createMemo(() => presentChildren())

  return (
    <For each={rendered()}>
      {(child) => (
        <PresenceChild keyValue={child.key} isPresent={child.isPresent} onExitComplete={handleExitComplete}>
          {child.element}
        </PresenceChild>
      )}
    </For>
  )
}

export function Presence(props: { when: boolean; children: JSX.Element; fallback?: JSX.Element; onExitComplete?: () => void }) {
  const [present, setPresent] = createSignal(props.when)
  const [callbacks, setCallbacks] = createSignal(new Set<() => void>())

  createEffect(() => {
    if (props.when) setPresent(true)
    if (!props.when && callbacks().size === 0) {
      setPresent(false)
      props.onExitComplete?.()
    }
  })

  const register = (onExitComplete: () => void) => {
    const set = callbacks()
    set.add(onExitComplete)
    setCallbacks(new Set(set))
    return () => {
      const updated = callbacks()
      updated.delete(onExitComplete)
      setCallbacks(new Set(updated))
    }
  }

  const context: PresenceContextValue = {
    isPresent: () => props.when,
    register,
    onExitComplete: (callback) => {
      const updated = callbacks()
      updated.delete(callback)
      setCallbacks(new Set(updated))
      if (!props.when && updated.size === 0) {
        setPresent(false)
        props.onExitComplete?.()
      }
    }
  }

  return (
    <PresenceContext.Provider value={context}>
      <Show when={present()} fallback={props.fallback}>
        {props.children}
      </Show>
    </PresenceContext.Provider>
  )
}

export function usePresence(): PresenceContextValue | null {
  return useContext(PresenceContext)
}

export default AnimatePresence
