import { render, screen } from "@solidjs/testing-library";
import { HTMLProjectionNode, visualElementStore } from "motion-dom";
import { createSignal, type Component, type JSX } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { LayoutGroup, motion } from "../../src";
import { useLayoutGroupContext } from "../../src/component/layout-group-context";

type ForwardRefComponentProps = {
  ref?: (element: HTMLDivElement) => void;
  "data-testid"?: string;
  children?: JSX.Element;
  animate?: unknown;
};

const getProjection = (element: Element) => {
  return visualElementStore.get(element)?.projection;
};

describe("layout runtime", () => {
  it("creates a projection node for layout-enabled hosts and filters layout props from the DOM", () => {
    render(() => (
      <motion.div
        data-testid="layout-host"
        layout="position"
        layoutId="card"
        layoutDependency="dep"
        layoutScroll
        layoutRoot
        layoutCrossfade={false}
        onBeforeLayoutMeasure={() => undefined}
        onLayoutMeasure={() => undefined}
        onLayoutAnimationStart={() => undefined}
        onLayoutAnimationComplete={() => undefined}
        data-framer-portal-id="portal"
      />
    ));

    const element = screen.getByTestId("layout-host");
    const projection = getProjection(element);

    expect(projection).toBeInstanceOf(HTMLProjectionNode);
    expect(projection?.options.layout).toBe("position");
    expect(projection?.options.layoutId).toBe("card");
    expect(projection?.options.layoutScroll).toBe(true);
    expect(projection?.options.layoutRoot).toBe(true);
    expect(projection?.options.crossfade).toBe(false);
    expect(element.hasAttribute("layout")).toBe(false);
    expect(element.hasAttribute("layoutId")).toBe(false);
    expect(element.hasAttribute("layoutDependency")).toBe(false);
    expect(element.hasAttribute("layoutScroll")).toBe(false);
    expect(element.hasAttribute("layoutRoot")).toBe(false);
    expect(element.hasAttribute("layoutCrossfade")).toBe(false);
    expect(element.hasAttribute("onLayoutAnimationStart")).toBe(false);
    expect(element.hasAttribute("onLayoutAnimationComplete")).toBe(false);
    expect(element.hasAttribute("data-framer-portal-id")).toBe(false);
  });

  it("prefixes layoutId values with the nearest LayoutGroup id", () => {
    render(() => (
      <LayoutGroup id="outer">
        <LayoutGroup id="inner">
          <motion.div data-testid="grouped-layout" layoutId="card" />
        </LayoutGroup>
      </LayoutGroup>
    ));

    const element = screen.getByTestId("grouped-layout");
    expect(getProjection(element)?.options.layoutId).toBe("outer-inner-card");
  });

  it("isolates nested LayoutGroup ids when inherit={false}", () => {
    render(() => (
      <LayoutGroup id="outer">
        <LayoutGroup id="inner" inherit={false}>
          <motion.div data-testid="isolated-layout" layoutId="card" />
        </LayoutGroup>
      </LayoutGroup>
    ));

    const element = screen.getByTestId("isolated-layout");
    expect(getProjection(element)?.options.layoutId).toBe("inner-card");
  });

  it("remeasures grouped layout nodes when forceRender is called", async () => {
    let forceRender: VoidFunction | undefined;

    const Consumer = () => {
      const context = useLayoutGroupContext();
      forceRender = context.forceRender;
      return null;
    };

    render(() => (
      <LayoutGroup id="outer">
        <Consumer />
        <motion.div data-testid="grouped-layout-host" layout />
      </LayoutGroup>
    ));

    const element = screen.getByTestId("grouped-layout-host");
    const projection = getProjection(element);

    expect(projection).toBeTruthy();
    const willUpdate = vi.spyOn(projection!, "willUpdate");

    forceRender?.();
    await Promise.resolve();

    expect(willUpdate).toHaveBeenCalledTimes(1);
  });

  it("only remeasures layout when layoutDependency changes", async () => {
    const [dependency, setDependency] = createSignal(0);
    const [color, setColor] = createSignal("rgb(239, 68, 68)");

    render(() => (
      <motion.div
        data-testid="dependency-layout"
        layout
        layoutDependency={dependency()}
        style={{ "background-color": color() }}
      />
    ));

    const element = screen.getByTestId("dependency-layout");
    const projection = getProjection(element);

    expect(projection).toBeTruthy();
    expect(projection?.options.layoutDependency).toBe(0);

    const willUpdate = vi.spyOn(projection!, "willUpdate");

    setColor("rgb(59, 130, 246)");
    await Promise.resolve();
    expect(projection?.options.layoutDependency).toBe(0);
    expect(willUpdate).not.toHaveBeenCalled();

    setDependency(1);
    await Promise.resolve();
    expect(projection?.options.layoutDependency).toBe(1);
    expect(willUpdate).toHaveBeenCalledTimes(1);
  });

  it("supports layout-capable custom components created with motion.create", () => {
    let receivedRef: HTMLDivElement | undefined;

    const Card: Component<ForwardRefComponentProps> = (props) => {
      return (
        <div
          ref={(element) => {
            props.ref?.(element);
          }}
          data-testid={props["data-testid"]}
        >
          {props.children}
        </div>
      );
    };

    const MotionCard = motion.create(Card);

    render(() => (
      <MotionCard
        data-testid="motion-card"
        layout
        ref={(element) => {
          receivedRef = element;
        }}
      >
        Card
      </MotionCard>
    ));

    const element = screen.getByTestId("motion-card");

    expect(receivedRef).toBe(element);
    expect(getProjection(element)).toBeTruthy();
  });

  it("forwards motion props to custom components only when enabled", () => {
    let defaultAnimate: unknown;
    let forwardedAnimate: unknown;

    const Card: Component<ForwardRefComponentProps> = (props) => {
      defaultAnimate ??= props.animate;

      return (
        <div
          ref={(element) => {
            props.ref?.(element);
          }}
          data-testid={props["data-testid"]}
        />
      );
    };

    const ForwardingCard: Component<ForwardRefComponentProps> = (props) => {
      forwardedAnimate ??= props.animate;

      return (
        <div
          ref={(element) => {
            props.ref?.(element);
          }}
          data-testid={props["data-testid"]}
        />
      );
    };

    const MotionCard = motion.create(Card);
    const MotionForwardingCard = motion.create(ForwardingCard, {
      forwardMotionProps: true,
    });

    render(() => (
      <>
        <MotionCard data-testid="default-card" animate={{ opacity: 1 }} />
        <MotionForwardingCard
          data-testid="forwarding-card"
          animate={{ opacity: 1 }}
        />
      </>
    ));

    expect(defaultAnimate).toBeUndefined();
    expect(forwardedAnimate).toEqual({ opacity: 1 });
  });
});
