import { Feature } from "motion-dom";

const thresholdNames = {
  some: 0,
  all: 1,
} as const;

type InViewAmount = keyof typeof thresholdNames | number;

const hasViewportOptionChanged =
  (
    viewport: {
      amount?: InViewAmount;
      margin?: string;
      root?: Element | Document | null;
    } = {},
    prevViewport: {
      amount?: InViewAmount;
      margin?: string;
      root?: Element | Document | null;
    } = {},
  ) =>
  (name: "amount" | "margin" | "root") =>
    viewport[name] !== prevViewport[name];

export class InViewFeature extends Feature<Element> {
  private hasEnteredView = false;
  private isInView = false;
  private observer?: IntersectionObserver;

  private startObserver() {
    this.unmount();

    const { viewport = {} } = this.node.getProps();
    const { root, margin: rootMargin, amount = "some", once } = viewport;

    const threshold =
      typeof amount === "number" ? amount : thresholdNames[amount];

    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const { isIntersecting } = entry;
        if (this.isInView === isIntersecting) return;

        this.isInView = isIntersecting;

        if (once && !isIntersecting && this.hasEnteredView) {
          return;
        } else if (isIntersecting) {
          this.hasEnteredView = true;
        }

        if (this.node.animationState) {
          this.node.animationState.setActive("whileInView", isIntersecting);
        }

        const { onViewportEnter, onViewportLeave } = this.node.getProps();
        const callback = isIntersecting ? onViewportEnter : onViewportLeave;
        callback?.(entry);

        if (once && isIntersecting) {
          this.observer?.disconnect();
        }
      },
      {
        root:
          root && typeof root === "object" && "current" in root
            ? (root.current ?? undefined)
            : (root ?? undefined),
        rootMargin,
        threshold,
      },
    );

    this.observer.observe(this.node.current!);
  }

  override mount() {
    if (typeof IntersectionObserver === "undefined" || !this.node.current) {
      return;
    }

    this.startObserver();
  }

  override update() {
    if (typeof IntersectionObserver === "undefined") return;

    const { viewport = {} } = this.node.getProps();
    const { viewport: prevViewport = {} } = this.node.prevProps ?? {};
    const hasChanged = (["amount", "margin", "root"] as const).some(
      hasViewportOptionChanged(
        viewport as {
          amount?: InViewAmount;
          margin?: string;
          root?: Element | Document | null;
        },
        prevViewport as {
          amount?: InViewAmount;
          margin?: string;
          root?: Element | Document | null;
        },
      ),
    );

    if (hasChanged) {
      this.startObserver();
    }
  }

  override unmount() {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}
