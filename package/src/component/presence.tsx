import {
  createContext,
  createUniqueId,
  useContext,
  type Accessor,
  type FlowComponent,
  type JSX,
  createSignal,
  createMemo,
} from "solid-js";
import { createListTransition } from "@solid-primitives/transition-group";
import { resolveElements } from "@solid-primitives/refs";
import { projectionManager } from "../projection/projection-manager";

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
   * Mark a registered descendant as safe to remove.
   */
  onExitComplete: (id: string, element?: Element) => void;

  /**
   * Whether entrance animations should be delayed (e.g., mode="wait" waiting for exits).
   * When true, newly entering Motion components should not start their initial→animate
   * animations until this becomes false.
   */
  isEntranceBlocked?: Accessor<boolean>;

  /**
   * Whether parent-driven unmounts should propagate exit handoff to descendants.
   */
  propagate?: Accessor<boolean>;
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

type AnimatePresenceContentProps = {
  pendingExits: Map<Element, () => void>;
  updateExitCount: VoidFunction;
  exitCount: Accessor<number>;
  mode: Accessor<AnimatePresenceMode>;
  root: Accessor<ShadowRoot | HTMLElement | undefined>;
  onElementExitComplete?: (el: Element) => void;
  setIsEntranceBlocked: (blocked: boolean) => void;
  children?: JSX.Element;
};

type MotionExitMarker = {
  __motionIsAnimatingExit?: boolean;
  __popLayoutCleanup?: VoidFunction;
  __motionPresenceId?: string;
  __motionForceExitTimeout?: ReturnType<typeof setTimeout>;
  __motionShouldExit?: boolean;
};

type PopLayoutRootState = {
  exitCount: number;
  originalPosition: string;
  originalMinWidth: string;
  originalMinHeight: string;
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

  // Memoize the resolved elements to ensure stable references
  const memoizedElements = createMemo<Element[]>((prev) => {
    const current = resolved();

    if (!prev) return current;

    // If the same elements are present, keep the previous references
    // This prevents createListTransition from seeing "new" elements on every call
    if (current.length === prev.length) {
      const allSame = current.every((el, i) => el === prev[i]);
      if (allSame) return prev;
    }

    return current;
  });

  let isWaiting = false;
  let queued: Element[] | null = null;
  let previous = memoizedElements();

  const getSource = () => {
    const current = memoizedElements();
    const mode = props.mode();

    if (mode !== "wait") {
      if (isWaiting) {
        isWaiting = false;
        props.setIsEntranceBlocked(false);
      }
      queued = null;
      previous = current;
      return current;
    }

    const exiting = props.exitCount() > 0;

    if (isWaiting) {
      if (!exiting) {
        const next = queued ?? current;
        isWaiting = false;
        props.setIsEntranceBlocked(false);
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
        props.setIsEntranceBlocked(true);
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
      props.setIsEntranceBlocked(true);
      queued = current;
      const unchanged = current.filter((el) => prevSet.has(el));
      previous = unchanged;
      return unchanged;
    }

    previous = current;
    return current;
  };

  // Track root mutations for popLayout so inline styles can be restored exactly.
  const popLayoutRootStates = new Map<HTMLElement, PopLayoutRootState>();

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

    const target = el as HTMLElement | SVGElement;

    // Temporarily remove transform to get accurate full-size position
    const prevTransform = target.style.transform;
    target.style.transform = "none";
    const layoutRect = target.getBoundingClientRect();
    target.style.transform = prevTransform;

    const rootRect = rootElement.getBoundingClientRect();

    const borderTop = parseFloat(rootStyle.borderTopWidth) || 0;
    const borderLeft = parseFloat(rootStyle.borderLeftWidth) || 0;

    const rootState = popLayoutRootStates.get(rootElement);
    if (rootState) {
      rootState.exitCount += 1;
    } else {
      popLayoutRootStates.set(rootElement, {
        exitCount: 1,
        originalPosition: rootElement.style.position,
        originalMinWidth: rootElement.style.minWidth,
        originalMinHeight: rootElement.style.minHeight,
      });

      if (rootStyle.position === "static") {
        rootElement.style.position = "relative";
      }

      rootElement.style.minWidth = `${rootRect.width}px`;
      rootElement.style.minHeight = `${rootRect.height}px`;
    }

    // Calculate position relative to the positioned parent
    const top =
      layoutRect.top - rootRect.top - borderTop + rootElement.scrollTop;
    const left =
      layoutRect.left - rootRect.left - borderLeft + rootElement.scrollLeft;

    // Apply absolute positioning
    target.style.position = "absolute";
    target.style.top = `${top}px`;
    target.style.left = `${left}px`;
    target.style.width = `${layoutRect.width}px`;
    target.style.height = `${layoutRect.height}px`;
    target.style.margin = "0";
    target.style.pointerEvents = "none";

    // Store cleanup function on the element for later
    (el as MotionExitMarker).__popLayoutCleanup = () => {
      const state = popLayoutRootStates.get(rootElement);
      if (!state) return;

      if (state.exitCount <= 1) {
        rootElement.style.position = state.originalPosition;
        rootElement.style.minWidth = state.originalMinWidth;
        rootElement.style.minHeight = state.originalMinHeight;
        popLayoutRootStates.delete(rootElement);
        return;
      }

      state.exitCount -= 1;
    };
  };

  const cleanupPopLayout = (el: Element) => {
    const marker = el as MotionExitMarker;
    const cleanup = marker.__popLayoutCleanup;
    if (typeof cleanup === "function") {
      cleanup();
      delete marker.__popLayoutCleanup;
    }
  };

  const scheduleLayoutAnimationsForUnmount = (el: Element) => {
    // Find the closest layout-enabled projection ancestor for this exiting element.
    let parent = el.parentElement;
    let layoutNode: any | undefined;

    while (parent) {
      const node = projectionManager.nodeByElement.get(parent);
      if (node && (node.options.layout || node.options.layoutId)) {
        layoutNode = node;
        break;
      }
      parent = parent.parentElement;
    }

    if (!layoutNode?.instance) return;

    // Schedule an update for the closest layout node. This snapshots the current layout
    // (with this element still present) and flushes after it gets removed.
    projectionManager.scheduleUpdate(layoutNode.instance);

    // Ensure any layout-enabled ancestors also snapshot so they can animate too.
    let ancestor = layoutNode.parent;
    while (ancestor) {
      if (ancestor.options.layout || ancestor.options.layoutId) {
        ancestor.willUpdate();
      }
      ancestor = ancestor.parent;
    }
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
        if (props.pendingExits.has(el)) continue;

        if (mode === "popLayout") applyPopLayout(el);

        const marker = el as MotionExitMarker;
        marker.__motionShouldExit = true;

        const clearForceExitTimeout = () => {
          const timeout = marker.__motionForceExitTimeout;
          if (timeout === undefined) return;
          clearTimeout(timeout);
          delete marker.__motionForceExitTimeout;
        };

        props.pendingExits.set(el, () => {
          clearForceExitTimeout();
          delete marker.__motionShouldExit;
          if (mode === "popLayout") cleanupPopLayout(el);
          scheduleLayoutAnimationsForUnmount(el);
          finishRemoved([el]);
        });

        marker.__motionForceExitTimeout = setTimeout(() => {
          if (!props.pendingExits.has(el)) return;
          const finish = props.pendingExits.get(el)!;
          props.pendingExits.delete(el);
          delete marker.__motionShouldExit;
          props.updateExitCount();
          finish();
        }, 10_000);

        // Safety check: if after a tick the element hasn't started an animation, remove it.
        // This handles non-motion elements.
        setTimeout(() => {
          const marker = el as unknown as MotionExitMarker;
          if (marker.__motionIsAnimatingExit) return;
          if (!props.pendingExits.has(el)) return;

          const finish = props.pendingExits.get(el)!;
          props.pendingExits.delete(el);
          delete marker.__motionShouldExit;
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
  const isPresent = () => (props.propagate ? isPresentInParent() : true);

  // We need to track exiting elements to know when to finish them.
  // element -> finishRemoved callback
  const pendingExits = new Map<Element, () => void>();
  const [exitCount, setExitCount] = createSignal(0);
  const updateExitCount = () => setExitCount(pendingExits.size);

  // Track whether entrance animations should be blocked (mode="wait" with pending exits)
  const [isEntranceBlocked, setIsEntranceBlocked] = createSignal(false);

  const onExitComplete = (id: string, el?: Element) => {
    const completePendingExit = (target: Element) => {
      const finish = pendingExits.get(target);
      if (!finish) return;

      pendingExits.delete(target);
      updateExitCount();
      finish();
    };

    // If it's an element-based completion (handoff)
    if (el && pendingExits.has(el)) {
      completePendingExit(el);
    } else {
      const matchingElement = Array.from(pendingExits.keys()).find((entry) => {
        const marker = entry as MotionExitMarker;
        return marker.__motionPresenceId === id;
      });

      if (matchingElement) {
        completePendingExit(matchingElement);
      }
    }

    if (pendingExits.size === 0) {
      props.onExitComplete?.();

      if (props.propagate && !isPresentInParent()) {
        safeToRemove?.();
      }
    }
  };

  const context: PresenceContextValue = {
    isPresent,
    initial: () => initial(),
    custom,
    onExitComplete,
    isEntranceBlocked,
    propagate: () => props.propagate === true,
  };

  return (
    <PresenceContext.Provider value={context}>
      <AnimatePresenceContent
        pendingExits={pendingExits}
        updateExitCount={updateExitCount}
        exitCount={exitCount}
        mode={mode}
        root={root}
        setIsEntranceBlocked={setIsEntranceBlocked}
      >
        {props.children}
      </AnimatePresenceContent>
    </PresenceContext.Provider>
  );
};
