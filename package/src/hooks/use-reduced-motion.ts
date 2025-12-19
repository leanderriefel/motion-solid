import { createSignal, onCleanup, type Accessor } from "solid-js";

/**
 * A hook that returns `true` if the current device has Reduced Motion setting enabled.
 *
 * This can be used to implement changes to your UI based on Reduced Motion.
 * For instance, replacing potentially motion-sickness inducing x/y animations
 * with opacity, disabling the autoplay of background videos, or turning off
 * parallax motion.
 *
 * It will actively respond to changes and re-render your components with the
 * latest setting.
 *
 * @example
 * ```tsx
 * function Sidebar(props: { isOpen: boolean }) {
 *   const shouldReduceMotion = useReducedMotion();
 *   const closedX = shouldReduceMotion() ? 0 : "-100%";
 *
 *   return (
 *     <Motion.div animate={{
 *       opacity: props.isOpen ? 1 : 0,
 *       x: props.isOpen ? 0 : closedX
 *     }} />
 *   );
 * }
 * ```
 */
export const useReducedMotion = (): Accessor<boolean> => {
  if (typeof window === "undefined") {
    // SSR - return a static false
    return () => false;
  }

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(
    mq.matches,
  );

  const handler = (e: MediaQueryListEvent) =>
    setPrefersReducedMotion(e.matches);
  mq.addEventListener("change", handler);

  onCleanup(() => mq.removeEventListener("change", handler));

  return prefersReducedMotion;
};
