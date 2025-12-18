import {
  children,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  untrack,
  For,
  useContext,
  type Accessor,
  type FlowComponent,
  type JSX,
} from "solid-js";

export type AnimatePresenceMode = "sync" | "wait" | "popLayout";

export interface AnimatePresenceProps {
  /**
   * Children elements.
   */
  children?: JSX.Element;

  /**
   * By passing `initial={false}`, AnimatePresence will disable any initial
   * animations on children that are present when the component is first rendered.
   */
  initial?: boolean;

  /**
   * Data to pass through to exiting children.
   */
  custom?: unknown;

  /**
   * Fires when all exiting nodes have completed animating out.
   */
  onExitComplete?: () => void;

  /**
   * Decides how AnimatePresence handles entering and exiting children.
   */
  mode?: AnimatePresenceMode;

  /**
   * If set to `true`, exit animations on children will also trigger when this
   * AnimatePresence exits from a parent AnimatePresence.
   */
  propagate?: boolean;

  /**
   * Root element for injecting `popLayout` styles.
   */
  root?: ShadowRoot | HTMLElement;
}

export interface PresenceContextValue {
  /**
   * Whether this subtree is still present in the tree.
   */
  isPresent: Accessor<boolean>;

  /**
   * Whether initial animations should run for this subtree.
   */
  initial: Accessor<boolean>;

  /**
   * Presence data passed from AnimatePresence's `custom` prop.
   */
  custom: Accessor<unknown>;

  /**
   * Register a descendant that should delay unmount until exit completes.
   */
  register: (id: string) => VoidFunction;

  /**
   * Mark a registered descendant as safe to remove.
   */
  onExitComplete: (id: string) => void;
}

export const PresenceContext = createContext<PresenceContextValue | null>(null);

export const usePresenceContext = () => useContext(PresenceContext);

/**
 * Returns presence state and a callback to manually trigger safe removal.
 *
 * Mirrors Motion/Framer Motion's `usePresence` API, with Solid accessors.
 */
export const usePresence = (): [
  Accessor<boolean>,
  VoidFunction | undefined,
] => {
  const presence = usePresenceContext();
  const isPresent: Accessor<boolean> = () => presence?.isPresent() ?? true;

  if (!presence) return [isPresent, undefined];

  const id = createUniqueId();

  createEffect(() => {
    const unregister = presence.register(id);
    onCleanup(unregister);
  });

  const safeToRemove = () => {
    presence.onExitComplete(id);
  };

  return [isPresent, safeToRemove];
};

export const useIsPresent = (): Accessor<boolean> => {
  const presence = usePresenceContext();
  return () => presence?.isPresent() ?? true;
};

export const usePresenceData = (): Accessor<unknown> => {
  const presence = usePresenceContext();
  return () => presence?.custom() ?? undefined;
};

type PresenceChildProps = {
  isPresent: Accessor<boolean>;
  initial: Accessor<boolean>;
  custom: Accessor<unknown>;
  onExitComplete?: () => void;
  children?: JSX.Element;
};

const PresenceChild: FlowComponent<PresenceChildProps> = (props) => {
  const completed = new Map<string, boolean>();
  const [didCompleteExit, setDidCompleteExit] = createSignal(false);

  const maybeCompleteExit = () => {
    if (props.isPresent()) {
      setDidCompleteExit(false);
      return;
    }

    if (didCompleteExit()) return;

    for (const done of completed.values()) {
      if (!done) return;
    }

    setDidCompleteExit(true);
    props.onExitComplete?.();
  };

  const register = (id: string) => {
    completed.set(id, false);

    return () => {
      completed.delete(id);
      maybeCompleteExit();
    };
  };

  const onExitComplete = (id: string) => {
    if (!completed.has(id)) return;
    completed.set(id, true);
    maybeCompleteExit();
  };

  createEffect(() => {
    if (props.isPresent()) {
      for (const id of completed.keys()) completed.set(id, false);
      setDidCompleteExit(false);
      return;
    }

    maybeCompleteExit();
  });

  const value: PresenceContextValue = {
    isPresent: props.isPresent,
    initial: props.initial,
    custom: props.custom,
    register,
    onExitComplete,
  };

  return (
    <PresenceContext.Provider value={value}>
      {props.children}
    </PresenceContext.Provider>
  );
};

type PresenceItem = {
  key: string;
  element: JSX.Element;
  isPresent: Accessor<boolean>;
  setIsPresent: (value: boolean) => void;
  initial: Accessor<boolean>;
};

const isRenderableChild = (child: unknown): child is JSX.Element =>
  child !== null && child !== undefined && child !== true && child !== false;

export const AnimatePresence: FlowComponent<AnimatePresenceProps> = (props) => {
  const resolved = children(() => props.children);
  const mode = () => props.mode ?? "sync";
  const custom = () => props.custom;

  const [isPresentInParent, safeToRemove] = usePresence();

  let isInitialRender = true;
  createEffect(() => {
    isInitialRender = false;
  });

  const [rendered, setRendered] = createSignal<PresenceItem[]>([]);
  const [pendingChildren, setPendingChildren] = createSignal<
    JSX.Element[] | null
  >(null);

  const keyMap = new WeakMap<object, string>();
  let nextKey = 0;

  const getKey = (child: JSX.Element, index: number): string => {
    if (typeof child === "string" || typeof child === "number")
      return String(child);

    if (child && typeof child === "object") {
      if (typeof Element !== "undefined" && child instanceof Element) {
        const attr = child.getAttribute("key");
        if (attr) return attr;
      }

      const existing = keyMap.get(child as object);
      if (existing) return existing;

      const generated = `presence-${nextKey++}`;
      keyMap.set(child as object, generated);
      return generated;
    }

    return `presence-index-${index}`;
  };

  const updateRendered = (nextChildren: JSX.Element[]) => {
    const current = untrack(() => rendered());
    const currentByKey = new Map<string, PresenceItem>();
    const currentKeys: string[] = [];

    for (const item of current) {
      currentByKey.set(item.key, item);
      currentKeys.push(item.key);
    }

    const nextKeys = nextChildren.map((child, i) => getKey(child, i));
    const nextKeySet = new Set(nextKeys);

    const exitingItems: PresenceItem[] = [];
    for (const item of current) {
      if (nextKeySet.has(item.key)) {
        item.setIsPresent(true);
      } else {
        item.setIsPresent(false);
        exitingItems.push(item);
      }
    }

    if (mode() === "wait" && exitingItems.length > 0) {
      setPendingChildren(nextChildren);
      setRendered(current);
      return;
    }

    if (mode() === "wait") {
      setPendingChildren(null);
    }

    const nextItems: PresenceItem[] = [];

    for (let i = 0; i < nextChildren.length; i++) {
      const key = nextKeys[i]!;
      const element = nextChildren[i]!;
      const existing = currentByKey.get(key);

      if (existing) {
        existing.element = element;
        nextItems.push(existing);
        continue;
      }

      const initialAllowed =
        props.initial !== false || !isInitialRender ? true : false;

      const [isPresent, setIsPresent] = createSignal(true);

      nextItems.push({
        key,
        element,
        isPresent,
        setIsPresent,
        initial: () => initialAllowed,
      });
    }

    if (exitingItems.length > 0) {
      const presentKeySet = new Set(nextKeys);

      for (let oldIndex = 0; oldIndex < currentKeys.length; oldIndex++) {
        const key = currentKeys[oldIndex]!;
        if (presentKeySet.has(key)) continue;

        const exiting = currentByKey.get(key);
        if (!exiting) continue;

        let anchorKey: string | null = null;
        for (let j = oldIndex - 1; j >= 0; j--) {
          const prevKey = currentKeys[j]!;
          if (presentKeySet.has(prevKey)) {
            anchorKey = prevKey;
            break;
          }
        }

        let insertIndex = 0;

        if (anchorKey) {
          const anchorIndex = nextItems.findIndex(
            (item) => item.key === anchorKey,
          );
          insertIndex = Math.max(0, anchorIndex + 1);
        }

        while (insertIndex < nextItems.length) {
          const candidate = nextItems[insertIndex];
          if (!candidate) break;
          if (untrack(() => candidate.isPresent())) break;
          insertIndex++;
        }

        nextItems.splice(insertIndex, 0, exiting);
      }
    }

    setRendered(nextItems);
  };

  const commitPendingChildrenIfReady = () => {
    if (mode() !== "wait") return;

    const current = untrack(() => rendered());
    const hasExiting = current.some((item) => !untrack(() => item.isPresent()));
    if (hasExiting) return;

    const pending = untrack(() => pendingChildren());
    if (!pending) return;

    setPendingChildren(null);
    updateRendered(pending);
  };

  const handleAllExitsComplete = () => {
    props.onExitComplete?.();
    commitPendingChildrenIfReady();

    if (
      props.propagate &&
      !isPresentInParent() &&
      untrack(() => rendered()).length === 0
    ) {
      safeToRemove?.();
    }
  };

  const handleItemExitComplete = (key: string) => {
    setRendered((prev) => prev.filter((item) => item.key !== key));

    const remaining = untrack(() => rendered());
    const stillExiting = remaining.some(
      (item) => !untrack(() => item.isPresent()),
    );

    if (!stillExiting) handleAllExitsComplete();
  };

  createEffect(() => {
    if (isPresentInParent()) return;
    if (props.propagate) return;
    safeToRemove?.();
  });

  createEffect(() => {
    const next = resolved
      .toArray()
      .filter(isRenderableChild) as unknown as JSX.Element[];

    if (props.propagate && !isPresentInParent()) {
      const current = untrack(() => rendered());
      for (const item of current) item.setIsPresent(false);
      if (current.length === 0) handleAllExitsComplete();
      return;
    }

    updateRendered(next);
  });

  return (
    <For each={rendered()}>
      {(item) => (
        <PresenceChild
          isPresent={item.isPresent}
          initial={item.initial}
          custom={custom}
          onExitComplete={() => handleItemExitComplete(item.key)}
        >
          {item.element}
        </PresenceChild>
      )}
    </For>
  );
};
