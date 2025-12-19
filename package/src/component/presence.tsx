import {
  createContext,
  createUniqueId,
  onCleanup,
  useContext,
  type Accessor,
  type FlowComponent,
  type JSX,
  createSignal,
  createEffect,
} from "solid-js";
import { createListTransition } from "@solid-primitives/transition-group";
import { resolveElements } from "@solid-primitives/refs";

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
  onExitComplete: (id: string, element?: Element) => void;
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
  const unregister = presence.register(id);
  onCleanup(unregister);

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
  register?: (id: string) => VoidFunction;
  children?: JSX.Element;
};

const PresenceChild: FlowComponent<PresenceChildProps> = (props) => {
  const completed = new Map<string, boolean>();
  const [didCompleteExit, setDidCompleteExit] = createSignal(false);

  // This ensures that we don't complete the exit immediately if no one has registered yet.
  // We wait one microtask to allow registrations to happen.
  let isChecking = false;

  const maybeCompleteExit = () => {
    if (props.isPresent()) {
      setDidCompleteExit(false);
      return;
    }

    if (didCompleteExit() || isChecking) return;

    isChecking = true;
    queueMicrotask(() => {
      isChecking = false;

      if (!props.isPresent() && !didCompleteExit()) {
        let allDone = true;
        for (const done of completed.values()) {
          if (!done) {
            allDone = false;
            break;
          }
        }

        if (allDone) {
          setDidCompleteExit(true);
          props.onExitComplete?.();
        }
      }
    });
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

type AnimatePresenceContentProps = {
  pendingExits: Map<Element, () => void>;
  updateExitCount: VoidFunction;
  exitCount: Accessor<number>;
  mode: Accessor<AnimatePresenceMode>;
  root: Accessor<ShadowRoot | HTMLElement | undefined>;
  children?: JSX.Element;
};

type MotionExitMarker = {
  __motionIsAnimatingExit?: boolean;
};

/**
 * Render AnimatePresence children *under* the PresenceContext provider.
 *
 * This is important: resolving children (and thus creating Motion components)
 * must happen with the provider in scope, otherwise `usePresenceContext()` will
 * be `null` and exit handoff can't work.
 */
const AnimatePresenceContent: FlowComponent<AnimatePresenceContentProps> = (
  props,
) => {
  const resolved = resolveElements(() => props.children).toArray;

  let isWaiting = false;
  let queued: Element[] | null = null;
  let previous = resolved();

  const getSource = () => {
    const current = resolved();
    const mode = props.mode();

    if (mode !== "wait") {
      isWaiting = false;
      queued = null;
      previous = current;
      return current;
    }

    const exiting = props.exitCount() > 0;

    if (isWaiting) {
      if (!exiting) {
        const next = queued ?? current;
        isWaiting = false;
        queued = null;
        previous = next;
        return next;
      }

      queued = current;
      return previous;
    }

    const prevSet = new Set(previous);

    if (exiting) {
      const hasAdded = current.some((el) => !prevSet.has(el));

      if (hasAdded) {
        isWaiting = true;
        queued = current;
        return previous;
      }

      previous = current;
      return current;
    }

    const currentSet = new Set(current);
    const hasRemoved = previous.some((el) => !currentSet.has(el));
    const hasAdded = current.some((el) => !prevSet.has(el));

    if (hasRemoved && hasAdded) {
      isWaiting = true;
      queued = current;
      const unchanged = current.filter((el) => prevSet.has(el));
      previous = unchanged;
      return unchanged;
    }

    previous = current;
    return current;
  };

  const applyPopLayout = (el: Element) => {
    if (typeof getComputedStyle !== "function") return;

    const root = props.root();
    const rootElement = root
      ? "host" in root
        ? root.host
        : root
      : el.parentElement;

    if (!(rootElement instanceof HTMLElement)) return;

    const rootStyle = getComputedStyle(rootElement);
    if (rootStyle.position === "static") {
      rootElement.style.position = "relative";
    }

    const borderTop = parseFloat(rootStyle.borderTopWidth) || 0;
    const borderLeft = parseFloat(rootStyle.borderLeftWidth) || 0;

    const target = el as HTMLElement | SVGElement;
    const prevTransform = target.style.transform;
    target.style.transform = "none";
    const layoutRect = target.getBoundingClientRect();
    target.style.transform = prevTransform;

    const rootRect = rootElement.getBoundingClientRect();

    const top =
      layoutRect.top - rootRect.top - borderTop + rootElement.scrollTop;
    const left =
      layoutRect.left - rootRect.left - borderLeft + rootElement.scrollLeft;

    target.style.position = "absolute";
    target.style.top = `${top}px`;
    target.style.left = `${left}px`;
    target.style.width = `${layoutRect.width}px`;
    target.style.height = `${layoutRect.height}px`;
  };

  const rendered = createListTransition(getSource, {
    exitMethod: "keep-index",
    onChange: ({ removed, finishRemoved }) => {
      const exitingElements = removed.filter(
        (el): el is Element => el instanceof Element,
      );

      if (exitingElements.length === 0) {
        finishRemoved(removed);
        return;
      }

      const mode = props.mode();

      for (const el of exitingElements) {
        if (mode === "popLayout") applyPopLayout(el);

        props.pendingExits.set(el, () => finishRemoved([el]));

        // Safety check: if after a tick the element hasn't started an animation, remove it.
        // This handles non-motion elements.
        setTimeout(() => {
          const marker = el as unknown as MotionExitMarker;
          if (marker.__motionIsAnimatingExit) return;
          if (!props.pendingExits.has(el)) return;
          const finish = props.pendingExits.get(el)!;
          props.pendingExits.delete(el);
          props.updateExitCount();
          finish();
        }, 0);
      }

      props.updateExitCount();
    },
  });

  return rendered as unknown as JSX.Element;
};

export const AnimatePresence: FlowComponent<AnimatePresenceProps> = (props) => {
  const custom = () => props.custom;
  const initial = () => props.initial ?? true;
  const mode: Accessor<AnimatePresenceMode> = () => props.mode ?? "sync";
  const root = () => props.root;

  const [isPresentInParent, safeToRemove] = usePresence();

  // We need to track exiting elements to know when to finish them.
  // element -> finishRemoved callback
  const pendingExits = new Map<Element, () => void>();
  const [exitCount, setExitCount] = createSignal(0);
  const updateExitCount = () => setExitCount(pendingExits.size);

  const onExitComplete = (id: string, el?: Element) => {
    // If it's an element-based completion (handoff)
    if (el && pendingExits.has(el)) {
      const finish = pendingExits.get(el)!;
      pendingExits.delete(el);
      updateExitCount();
      finish();
    }

    if (pendingExits.size === 0) {
      props.onExitComplete?.();

      if (props.propagate && !isPresentInParent()) {
        safeToRemove?.();
      }
    }
  };

  // Register isn't used for the Handoff flow usually, but we keep it for API compat
  const register = (id: string) => {
    return () => {};
  };

  const context: PresenceContextValue = {
    isPresent: isPresentInParent, // Pass through parent presence (or true if root)
    initial: () => initial(),
    custom,
    register,
    onExitComplete,
  };

  return (
    <PresenceContext.Provider value={context}>
      <AnimatePresenceContent
        pendingExits={pendingExits}
        updateExitCount={updateExitCount}
        exitCount={exitCount}
        mode={mode}
        root={root}
      >
        {props.children}
      </AnimatePresenceContent>
    </PresenceContext.Provider>
  );
};
