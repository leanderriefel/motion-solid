import type { Accessor, FlowComponent, JSX } from "solid-js";
import {
  createContext,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
} from "solid-js";
import type { Transition } from "../types";

export type ReducedMotionConfig = "always" | "never" | "user";

export interface MotionConfigContextValue {
  transition: Accessor<Transition | undefined>;
  reducedMotion: Accessor<ReducedMotionConfig>;
  isReducedMotion: Accessor<boolean>;
}

export const MotionConfigContext =
  createContext<MotionConfigContextValue | null>(null);

export const useMotionConfig = () => useContext(MotionConfigContext);

export interface MotionConfigProps {
  transition?: Transition;
  /**
   * Controls how reduced motion preference is handled.
   * - "user": Respect the user's device setting (prefers-reduced-motion)
   * - "always": Always reduce motion (useful for debugging)
   * - "never": Never reduce motion (default)
   *
   * When reduced motion is active, transform and layout animations are
   * disabled while other animations like opacity and colors persist.
   */
  reducedMotion?: ReducedMotionConfig;
  children?: JSX.Element;
}

// Module-level cache for system preference to avoid creating multiple listeners
let systemPrefersReducedMotionSignal: ReturnType<
  typeof createSignal<boolean>
> | null = null;
let mediaQueryCleanup: (() => void) | null = null;
let listenerCount = 0;

/**
 * Get or create the shared system preference signal.
 * Uses reference counting to clean up when no components are using it.
 */
const useSystemReducedMotion = (): Accessor<boolean> => {
  if (typeof window === "undefined") {
    // SSR - return a static false
    return () => false;
  }

  // Initialize the shared signal if needed
  if (!systemPrefersReducedMotionSignal) {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const [get, set] = createSignal(mq.matches);
    systemPrefersReducedMotionSignal = [get, set];

    const handler = (e: MediaQueryListEvent) => set(e.matches);

    const addListener = () => {
      if (mq.addEventListener) {
        mq.addEventListener("change", handler);
      } else {
        mq.addListener(handler);
      }
    };

    const removeListener = () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler);
      } else {
        mq.removeListener(handler);
      }
    };

    addListener();

    mediaQueryCleanup = () => {
      removeListener();
      systemPrefersReducedMotionSignal = null;
      mediaQueryCleanup = null;
    };
  }

  listenerCount++;

  onCleanup(() => {
    listenerCount--;
    if (listenerCount === 0 && mediaQueryCleanup) {
      mediaQueryCleanup();
    }
  });

  return systemPrefersReducedMotionSignal[0];
};

export const MotionConfig: FlowComponent<MotionConfigProps> = (props) => {
  const parent = useMotionConfig();
  const systemPreference = useSystemReducedMotion();

  const transition = createMemo<Transition | undefined>(() => {
    return props.transition ?? parent?.transition();
  });

  const reducedMotion = createMemo<ReducedMotionConfig>(() => {
    return props.reducedMotion ?? parent?.reducedMotion() ?? "never";
  });

  const isReducedMotion = createMemo<boolean>(() => {
    const config = reducedMotion();
    if (config === "always") return true;
    if (config === "never") return false;
    return systemPreference(); // "user" - respect system preference
  });

  return (
    <MotionConfigContext.Provider
      value={{ transition, reducedMotion, isReducedMotion }}
    >
      {props.children}
    </MotionConfigContext.Provider>
  );
};
