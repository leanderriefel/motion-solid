import {
  createContext,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  useContext,
  type Accessor,
  type FlowComponent,
  type JSX,
} from "solid-js";
import { createListTransition } from "@solid-primitives/transition-group";
import { resolveElements } from "@solid-primitives/refs";
import { useLayoutGroupContext } from "./layout-group-context";

export type AnimatePresenceMode = "sync" | "wait" | "popLayout";

export interface AnimatePresenceProps {
  children?: JSX.Element;
  initial?: boolean;
  custom?: unknown;
  onExitComplete?: () => void;
  mode?: AnimatePresenceMode;
  propagate?: boolean;
  presenceAffectsLayout?: boolean;
  anchorX?: "left" | "right";
  anchorY?: "top" | "bottom";
  root?: HTMLElement | ShadowRoot;
}

export interface PresenceContextValue {
  id?: string;
  isPresent: Accessor<boolean>;
  initial: Accessor<boolean>;
  custom: Accessor<unknown>;
  onExitComplete: (id: string, element?: Element) => void;
  register: (id: string | number) => VoidFunction;
  isEntranceBlocked?: Accessor<boolean>;
  propagate?: Accessor<boolean>;
}

type MotionExitMarker = Element & {
  __motionIsAnimatingExit?: boolean;
  __motionPresenceId?: string;
  __motionForceExitTimeout?: ReturnType<typeof setTimeout>;
  __motionShouldExit?: boolean;
  __motionPopCleanup?: VoidFunction;
  __motionHandleExitComplete?: VoidFunction;
};

type PendingExit = {
  finish: VoidFunction;
};

export const PresenceContext = createContext<PresenceContextValue | null>(null);

export const usePresenceContext = () => useContext(PresenceContext);

export const usePresence = (
  subscribe = true,
): [Accessor<boolean>, VoidFunction | undefined] => {
  const presence = usePresenceContext();
  const isPresent: Accessor<boolean> = () => presence?.isPresent() ?? true;

  if (!presence) return [isPresent, undefined];

  const id = createUniqueId();
  const unregister = subscribe ? presence.register(id) : undefined;
  if (unregister) {
    onCleanup(unregister);
  }

  const safeToRemove = () => {
    presence.onExitComplete(id);
  };

  return [isPresent, subscribe ? safeToRemove : undefined];
};

export const useIsPresent = (): Accessor<boolean> => {
  const presence = usePresenceContext();
  return () => presence?.isPresent() ?? true;
};

export const usePresenceData = <T = unknown,>(): Accessor<T | undefined> => {
  const presence = usePresenceContext();
  return () => presence?.custom() as T | undefined;
};

type AnimatePresenceContentProps = {
  pendingExits: Map<Element, PendingExit>;
  completedExitElements: Set<Element>;
  completedExitIds: Set<string>;
  onPendingExitComplete: VoidFunction;
  updateExitCount: VoidFunction;
  exitCount: Accessor<number>;
  mode: Accessor<AnimatePresenceMode>;
  setIsEntranceBlocked: (blocked: boolean) => void;
  root?: HTMLElement | ShadowRoot;
  anchorX: Accessor<"left" | "right">;
  anchorY: Accessor<"top" | "bottom">;
  children?: JSX.Element;
};

let popId = 0;

const applyPopLayout = (
  element: Element,
  root: HTMLElement | ShadowRoot | undefined,
  anchorX: "left" | "right",
  anchorY: "top" | "bottom",
) => {
  if (!(element instanceof HTMLElement)) return undefined;

  const parent = element.offsetParent;
  const parentWidth = parent instanceof HTMLElement ? parent.offsetWidth : 0;
  const parentHeight = parent instanceof HTMLElement ? parent.offsetHeight : 0;
  const width = element.offsetWidth;
  const height = element.offsetHeight;

  if (!width || !height) return undefined;

  const top = element.offsetTop;
  const left = element.offsetLeft;
  const right = parentWidth - width - left;
  const bottom = parentHeight - height - top;
  const id = String(popId++);
  const x = anchorX === "left" ? `left: ${left}px` : `right: ${right}px`;
  const y = anchorY === "top" ? `top: ${top}px` : `bottom: ${bottom}px`;
  const style = document.createElement("style");
  const styleRoot = root ?? document.head;

  element.dataset.motionPopId = id;
  styleRoot.appendChild(style);

  if (style.sheet) {
    style.sheet.insertRule(`
      [data-motion-pop-id="${id}"] {
        position: absolute !important;
        width: ${width}px !important;
        height: ${height}px !important;
        ${x} !important;
        ${y} !important;
      }
    `);
  }

  return () => {
    delete element.dataset.motionPopId;
    if (styleRoot.contains(style)) {
      styleRoot.removeChild(style);
    }
  };
};

const AnimatePresenceContent: FlowComponent<AnimatePresenceContentProps> = (
  props,
) => {
  const resolved = resolveElements(() => props.children).toArray;

  const memoizedElements = createMemo<Element[]>((prev) => {
    const current = resolved();
    if (!prev) return current;

    if (current.length === prev.length) {
      const allSame = current.every(
        (element, index) => element === prev[index],
      );
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
      const hasAdded = current.some((element) => !prevSet.has(element));
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
    const hasRemoved = previous.some((element) => !currentSet.has(element));
    const hasAdded = current.some((element) => !prevSet.has(element));

    if (hasRemoved && hasAdded) {
      isWaiting = true;
      props.setIsEntranceBlocked(true);
      queued = current;
      const unchanged = current.filter((element) => prevSet.has(element));
      previous = unchanged;
      return unchanged;
    }

    previous = current;
    return current;
  };

  const rendered = createListTransition(getSource, {
    exitMethod: "keep-index",
    onChange: ({ removed, finishRemoved }) => {
      const exitingElements = removed.filter(
        (element): element is Element => element instanceof Element,
      );

      if (exitingElements.length === 0) {
        finishRemoved(removed);
        return;
      }

      for (const element of exitingElements) {
        if (props.pendingExits.has(element)) continue;

        const marker = element as MotionExitMarker;
        marker.__motionShouldExit = true;

        if (props.mode() === "popLayout") {
          marker.__motionPopCleanup = applyPopLayout(
            element,
            props.root,
            props.anchorX(),
            props.anchorY(),
          );
        }

        const clearForceExitTimeout = () => {
          const timeout = marker.__motionForceExitTimeout;
          if (timeout === undefined) return;
          clearTimeout(timeout);
          delete marker.__motionForceExitTimeout;
        };

        const finishPendingExit = () => {
          const pending = props.pendingExits.get(element);
          if (!pending) return;

          props.pendingExits.delete(element);
          pending.finish();
          props.updateExitCount();

          if (props.pendingExits.size === 0) {
            props.onPendingExitComplete();
          }
        };

        props.pendingExits.set(element, {
          finish: () => {
            clearForceExitTimeout();
            marker.__motionPopCleanup?.();
            delete marker.__motionPopCleanup;
            delete marker.__motionShouldExit;
            delete marker.__motionHandleExitComplete;
            finishRemoved([element]);
          },
        });

        marker.__motionHandleExitComplete = finishPendingExit;

        queueMicrotask(() => {
          const presenceId = marker.__motionPresenceId;
          const alreadyCompleted =
            props.completedExitElements.delete(element) ||
            (presenceId ? props.completedExitIds.delete(presenceId) : false);

          if (alreadyCompleted) {
            finishPendingExit();
          }
        });

        marker.__motionForceExitTimeout = setTimeout(() => {
          finishPendingExit();
        }, 10_000);

        setTimeout(() => {
          if (marker.__motionIsAnimatingExit) return;
          finishPendingExit();
        }, 0);
      }

      props.updateExitCount();
    },
  });

  return rendered as unknown as JSX.Element;
};

export const AnimatePresence: FlowComponent<AnimatePresenceProps> = (props) => {
  const layoutGroup = useLayoutGroupContext();
  const contextId = createUniqueId();
  const custom = () => props.custom;
  const [isInitialRender, setIsInitialRender] = createSignal(true);
  const initial = () => (isInitialRender() ? (props.initial ?? true) : true);
  const mode = () => props.mode ?? "popLayout";
  const anchorX = () => props.anchorX ?? "left";
  const anchorY = () => props.anchorY ?? "top";
  const presenceAffectsLayout = () => props.presenceAffectsLayout ?? true;

  const [isPresentInParent, safeToRemove] = usePresence();
  const isPresent = () => (props.propagate ? isPresentInParent() : true);

  const pendingExits = new Map<Element, PendingExit>();
  const completedExitElements = new Set<Element>();
  const completedExitIds = new Set<string>();
  const [exitCount, setExitCount] = createSignal(0);
  const updateExitCount = () => setExitCount(pendingExits.size);
  const [isEntranceBlocked, setIsEntranceBlocked] = createSignal(false);

  const register = (_id: string | number) => () => undefined;

  onMount(() => {
    setIsInitialRender(false);
  });

  const onExitComplete = (id: string, element?: Element) => {
    let didCompletePendingExit = false;

    const completePendingExit = (target: Element) => {
      const pending = pendingExits.get(target);
      if (!pending) return;

      pendingExits.delete(target);
      pending.finish();
      updateExitCount();
      didCompletePendingExit = true;
    };

    if (element && pendingExits.has(element)) {
      completePendingExit(element);
    } else if (id) {
      const matchingElement = Array.from(pendingExits.keys()).find((entry) => {
        const marker = entry as MotionExitMarker;
        return marker.__motionPresenceId === id;
      });

      if (matchingElement) {
        completePendingExit(matchingElement);
      }
    }

    if (!didCompletePendingExit) {
      if (element) {
        completedExitElements.add(element);
      }
      if (id) {
        completedExitIds.add(id);
      }
      return;
    }

    if (pendingExits.size === 0) {
      finishAllExits();
    }
  };

  const finishAllExits = () => {
    if (presenceAffectsLayout()) {
      layoutGroup.forceRender?.();
    }

    props.onExitComplete?.();

    if (props.propagate && !isPresentInParent()) {
      safeToRemove?.();
    }
  };

  const context = createMemo<PresenceContextValue>(() => ({
    id: contextId,
    isPresent,
    initial,
    custom,
    onExitComplete,
    register,
    isEntranceBlocked,
    propagate: () => props.propagate === true,
  }));

  return (
    <PresenceContext.Provider value={context()}>
      <AnimatePresenceContent
        pendingExits={pendingExits}
        completedExitElements={completedExitElements}
        completedExitIds={completedExitIds}
        onPendingExitComplete={finishAllExits}
        updateExitCount={updateExitCount}
        exitCount={exitCount}
        mode={mode}
        root={props.root}
        anchorX={anchorX}
        anchorY={anchorY}
        setIsEntranceBlocked={setIsEntranceBlocked}
      >
        {props.children}
      </AnimatePresenceContent>
    </PresenceContext.Provider>
  );
};
