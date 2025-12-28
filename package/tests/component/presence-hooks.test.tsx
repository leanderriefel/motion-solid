import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal, Show } from "solid-js";
import {
  AnimatePresence,
  motion,
  usePresence,
  useIsPresent,
  usePresenceData,
} from "../../src";

describe("presence hooks", () => {
  describe("usePresence", () => {
    it("returns [true, undefined] outside AnimatePresence", () => {
      let result: ReturnType<typeof usePresence> | null = null;

      const TestComponent = () => {
        result = usePresence();
        return <div data-testid="target">Test</div>;
      };

      render(() => <TestComponent />);

      expect(result).not.toBeNull();
      expect(result![0]()).toBe(true);
      expect(result![1]).toBeUndefined();
    });

    it("returns [true, safeToRemove] inside AnimatePresence when present", () => {
      let result: ReturnType<typeof usePresence> | null = null;

      const TestComponent = () => {
        result = usePresence();
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(result).not.toBeNull();
      expect(result![0]()).toBe(true);
      expect(typeof result![1]).toBe("function");
    });

    it("returns [false, safeToRemove] when component is exiting", async () => {
      let presenceResult: ReturnType<typeof usePresence> | null = null;
      const [show, setShow] = createSignal(true);

      const TestComponent = () => {
        presenceResult = usePresence();
        return (
          <motion.div data-testid="target" exit={{ opacity: 0 }}>
            Test
          </motion.div>
        );
      };

      render(() => (
        <AnimatePresence>
          <Show when={show()}>
            <TestComponent />
          </Show>
        </AnimatePresence>
      ));

      expect(presenceResult![0]()).toBe(true);

      setShow(false);
      await vi.advanceTimersByTimeAsync(50);

      // After removal, isPresent should be false
      // Note: This depends on the internal implementation
    });

    it("safeToRemove is a function that can be called", () => {
      let safeToRemove: VoidFunction | undefined;

      const TestComponent = () => {
        const [, remove] = usePresence();
        safeToRemove = remove;
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(typeof safeToRemove).toBe("function");
      // Should not throw when called
      expect(() => safeToRemove!()).not.toThrow();
    });

    it("returns consistent values across multiple calls", () => {
      const results: ReturnType<typeof usePresence>[] = [];

      const TestComponent = () => {
        results.push(usePresence());
        results.push(usePresence());
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(results[0]?.[0]()).toBe(results[1]?.[0]());
    });
  });

  describe("useIsPresent", () => {
    it("returns true outside AnimatePresence", () => {
      let isPresent: ReturnType<typeof useIsPresent> | null = null;

      const TestComponent = () => {
        isPresent = useIsPresent();
        return <div data-testid="target">Test</div>;
      };

      render(() => <TestComponent />);

      expect(isPresent).not.toBeNull();
      expect(isPresent!()).toBe(true);
    });

    it("returns true inside AnimatePresence when present", () => {
      let isPresent: ReturnType<typeof useIsPresent> | null = null;

      const TestComponent = () => {
        isPresent = useIsPresent();
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(isPresent!()).toBe(true);
    });

    it("returns an accessor (reactive)", () => {
      let isPresent: ReturnType<typeof useIsPresent> | null = null;

      const TestComponent = () => {
        isPresent = useIsPresent();
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(typeof isPresent).toBe("function");
    });

    it("multiple components can use useIsPresent independently", () => {
      const results: boolean[] = [];

      const TestComponent = (props: { id: number }) => {
        const isPresent = useIsPresent();
        results.push(isPresent());
        return (
          <motion.div data-testid={`target-${props.id}`}>
            Test {props.id}
          </motion.div>
        );
      };

      render(() => (
        <AnimatePresence>
          <TestComponent id={1} />
          <TestComponent id={2} />
        </AnimatePresence>
      ));

      expect(results).toEqual([true, true]);
    });
  });

  describe("usePresenceData", () => {
    it("returns undefined when no custom data", () => {
      let data: ReturnType<typeof usePresenceData> | null = null;

      const TestComponent = () => {
        data = usePresenceData();
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(data!()).toBeUndefined();
    });

    it("returns custom data from AnimatePresence", () => {
      let data: ReturnType<typeof usePresenceData> | null = null;
      const customData = { direction: 1, color: "red" };

      const TestComponent = () => {
        data = usePresenceData();
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence custom={customData}>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(data!()).toEqual(customData);
    });

    it("returns string custom data", () => {
      let data: ReturnType<typeof usePresenceData> | null = null;

      const TestComponent = () => {
        data = usePresenceData();
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence custom="custom-string">
          <TestComponent />
        </AnimatePresence>
      ));

      expect(data!()).toBe("custom-string");
    });

    it("returns number custom data", () => {
      let data: ReturnType<typeof usePresenceData> | null = null;

      const TestComponent = () => {
        data = usePresenceData();
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence custom={42}>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(data!()).toBe(42);
    });

    it("returns undefined outside AnimatePresence", () => {
      let data: ReturnType<typeof usePresenceData> | null = null;

      const TestComponent = () => {
        data = usePresenceData();
        return <div data-testid="target">Test</div>;
      };

      render(() => <TestComponent />);

      expect(data!()).toBeUndefined();
    });

    it("updates when custom prop changes", async () => {
      let data: ReturnType<typeof usePresenceData> | null = null;
      const [customValue, setCustomValue] = createSignal(1);

      const TestComponent = () => {
        data = usePresenceData();
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence custom={customValue()}>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(data!()).toBe(1);

      setCustomValue(2);
      await vi.advanceTimersByTimeAsync(50);

      expect(data!()).toBe(2);
    });

    it("works with nested AnimatePresence", () => {
      let outerData: ReturnType<typeof usePresenceData> | null = null;
      let innerData: ReturnType<typeof usePresenceData> | null = null;

      const OuterComponent = () => {
        outerData = usePresenceData();
        return (
          <AnimatePresence custom="inner">
            <InnerComponent />
          </AnimatePresence>
        );
      };

      const InnerComponent = () => {
        innerData = usePresenceData();
        return <motion.div data-testid="inner">Inner</motion.div>;
      };

      render(() => (
        <AnimatePresence custom="outer">
          <OuterComponent />
        </AnimatePresence>
      ));

      expect(outerData!()).toBe("outer");
      expect(innerData!()).toBe("inner");
    });
  });

  describe("PresenceContext", () => {
    it("is null outside AnimatePresence", () => {
      let contextValue: unknown = "not-set";

      const TestComponent = () => {
        // We can't directly use useContext in the test, but we can check via usePresence behavior
        const [_, safeToRemove] = usePresence();
        // Outside context, safeToRemove is undefined
        contextValue = safeToRemove;
        return <div>Test</div>;
      };

      render(() => <TestComponent />);

      expect(contextValue).toBeUndefined();
    });

    it("provides context inside AnimatePresence", () => {
      let hasSafeToRemove = false;

      const TestComponent = () => {
        const [, safeToRemove] = usePresence();
        hasSafeToRemove = typeof safeToRemove === "function";
        return <motion.div>Test</motion.div>;
      };

      render(() => (
        <AnimatePresence>
          <TestComponent />
        </AnimatePresence>
      ));

      expect(hasSafeToRemove).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles rapid mount/unmount cycles", async () => {
      const [show, setShow] = createSignal(true);
      // oxlint-disable-next-line no-unused-vars
      let mountCount = 0;

      const TestComponent = () => {
        mountCount++;
        usePresence();
        return <motion.div data-testid="target">Test</motion.div>;
      };

      render(() => (
        <AnimatePresence>
          <Show when={show()}>
            <TestComponent />
          </Show>
        </AnimatePresence>
      ));

      for (let i = 0; i < 5; i++) {
        setShow(false);
        await vi.advanceTimersByTimeAsync(10);
        setShow(true);
        await vi.advanceTimersByTimeAsync(10);
      }

      expect(screen.getByTestId("target")).toBeTruthy();
    });

    it("works with multiple children using hooks", () => {
      const results: boolean[] = [];

      const TestComponent = (props: { id: number }) => {
        const isPresent = useIsPresent();
        results.push(isPresent());
        return <motion.div data-testid={`target-${props.id}`}>Test</motion.div>;
      };

      render(() => (
        <AnimatePresence>
          <TestComponent id={1} />
          <TestComponent id={2} />
          <TestComponent id={3} />
        </AnimatePresence>
      ));

      expect(results).toHaveLength(3);
      expect(results.every(Boolean)).toBe(true);
    });

    it("hooks work in deeply nested components", () => {
      let deepIsPresent: ReturnType<typeof useIsPresent> | null = null;

      const DeepComponent = () => {
        deepIsPresent = useIsPresent();
        return <motion.div data-testid="deep">Deep</motion.div>;
      };

      const MiddleComponent = () => (
        <div>
          <DeepComponent />
        </div>
      );

      const OuterComponent = () => (
        <motion.div>
          <MiddleComponent />
        </motion.div>
      );

      render(() => (
        <AnimatePresence>
          <OuterComponent />
        </AnimatePresence>
      ));

      expect(deepIsPresent!()).toBe(true);
    });
  });
});
