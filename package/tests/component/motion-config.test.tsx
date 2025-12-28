import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { motion, MotionConfig, useMotionConfig } from "../../src";

describe("MotionConfig", () => {
  describe("transition inheritance", () => {
    it("provides transition context to children", () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig transition={{ duration: 0.5 }}>
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue).not.toBeNull();
      expect(configValue!.transition()).toEqual({ duration: 0.5 });
    });

    it("motion component uses MotionConfig transition", async () => {
      render(() => (
        <MotionConfig transition={{ duration: 0.3 }}>
          <motion.div
            data-testid="target"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        </MotionConfig>
      ));

      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element).toBeTruthy();
    });

    it("component-level transition overrides MotionConfig", async () => {
      let configTransition: any = null;

      const TestComponent = () => {
        const config = useMotionConfig();
        configTransition = config?.transition();
        return (
          <motion.div
            data-testid="target"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
        );
      };

      render(() => (
        <MotionConfig transition={{ duration: 0.5 }}>
          <TestComponent />
        </MotionConfig>
      ));

      await vi.advanceTimersByTimeAsync(50);
      expect(configTransition).toEqual({ duration: 0.5 });
    });

    it("handles transition with multiple properties", () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig
          transition={{
            duration: 0.5,
            ease: "easeInOut",
            delay: 0.1,
          }}
        >
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue!.transition()).toEqual({
        duration: 0.5,
        ease: "easeInOut",
        delay: 0.1,
      });
    });

    it("transition is undefined outside MotionConfig", () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => <TestComponent />);

      expect(configValue).toBeNull();
    });
  });

  describe("context nesting", () => {
    it("inner MotionConfig overrides outer", () => {
      let outerValue: ReturnType<typeof useMotionConfig> = null;
      let innerValue: ReturnType<typeof useMotionConfig> = null;

      const OuterComponent = () => {
        outerValue = useMotionConfig();
        return (
          <MotionConfig transition={{ duration: 0.3 }}>
            <InnerComponent />
          </MotionConfig>
        );
      };

      const InnerComponent = () => {
        innerValue = useMotionConfig();
        return <div data-testid="inner">Inner</div>;
      };

      render(() => (
        <MotionConfig transition={{ duration: 0.5 }}>
          <OuterComponent />
        </MotionConfig>
      ));

      expect(outerValue!.transition()).toEqual({ duration: 0.5 });
      expect(innerValue!.transition()).toEqual({ duration: 0.3 });
    });

    it("deeply nested MotionConfig works correctly", () => {
      let level1Value: any = null;
      let level2Value: any = null;
      let level3Value: any = null;

      const Level1 = () => {
        level1Value = useMotionConfig()?.transition();
        return (
          <MotionConfig transition={{ duration: 0.2 }}>
            <Level2 />
          </MotionConfig>
        );
      };

      const Level2 = () => {
        level2Value = useMotionConfig()?.transition();
        return (
          <MotionConfig transition={{ duration: 0.1 }}>
            <Level3 />
          </MotionConfig>
        );
      };

      const Level3 = () => {
        level3Value = useMotionConfig()?.transition();
        return <div data-testid="level3">Level 3</div>;
      };

      render(() => (
        <MotionConfig transition={{ duration: 0.3 }}>
          <Level1 />
        </MotionConfig>
      ));

      expect(level1Value).toEqual({ duration: 0.3 });
      expect(level2Value).toEqual({ duration: 0.2 });
      expect(level3Value).toEqual({ duration: 0.1 });
    });

    it("child inherits from parent when not overridden", () => {
      let childValue: ReturnType<typeof useMotionConfig> = null;

      const Child = () => {
        childValue = useMotionConfig();
        return <div data-testid="child">Child</div>;
      };

      render(() => (
        <MotionConfig transition={{ duration: 0.5 }}>
          <div>
            <div>
              <Child />
            </div>
          </div>
        </MotionConfig>
      ));

      expect(childValue!.transition()).toEqual({ duration: 0.5 });
    });
  });

  describe("reducedMotion prop", () => {
    it("reducedMotion='always' sets isReducedMotion to true", () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig reducedMotion="always">
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue!.reducedMotion()).toBe("always");
      expect(configValue!.isReducedMotion()).toBe(true);
    });

    it("reducedMotion='never' sets isReducedMotion to false", () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig reducedMotion="never">
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue!.reducedMotion()).toBe("never");
      expect(configValue!.isReducedMotion()).toBe(false);
    });

    it("reducedMotion='user' respects system preference", () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig reducedMotion="user">
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue!.reducedMotion()).toBe("user");
      // Default mock returns false for prefers-reduced-motion
      expect(configValue!.isReducedMotion()).toBe(false);
    });

    it("default reducedMotion is 'never'", () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig transition={{ duration: 0.5 }}>
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue!.reducedMotion()).toBe("never");
    });

    it("reducedMotion is inherited from parent", () => {
      let childValue: ReturnType<typeof useMotionConfig> = null;

      const Child = () => {
        childValue = useMotionConfig();
        return <div>Child</div>;
      };

      render(() => (
        <MotionConfig reducedMotion="always">
          <MotionConfig transition={{ duration: 0.5 }}>
            <Child />
          </MotionConfig>
        </MotionConfig>
      ));

      expect(childValue!.reducedMotion()).toBe("always");
      expect(childValue!.isReducedMotion()).toBe(true);
    });

    it("child reducedMotion overrides parent", () => {
      let childValue: ReturnType<typeof useMotionConfig> = null;

      const Child = () => {
        childValue = useMotionConfig();
        return <div>Child</div>;
      };

      render(() => (
        <MotionConfig reducedMotion="always">
          <MotionConfig reducedMotion="never">
            <Child />
          </MotionConfig>
        </MotionConfig>
      ));

      expect(childValue!.reducedMotion()).toBe("never");
      expect(childValue!.isReducedMotion()).toBe(false);
    });
  });

  describe("combined props", () => {
    it("handles both transition and reducedMotion", () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig transition={{ duration: 0.5 }} reducedMotion="always">
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue!.transition()).toEqual({ duration: 0.5 });
      expect(configValue!.reducedMotion()).toBe("always");
      expect(configValue!.isReducedMotion()).toBe(true);
    });
  });

  describe("reactivity", () => {
    it("updates when transition prop changes", async () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;
      const [duration, setDuration] = createSignal(0.5);

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig transition={{ duration: duration() }}>
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue!.transition()).toEqual({ duration: 0.5 });

      setDuration(1.0);
      await vi.advanceTimersByTimeAsync(50);

      expect(configValue!.transition()).toEqual({ duration: 1.0 });
    });

    it("updates when reducedMotion prop changes", async () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;
      const [reduced, setReduced] = createSignal<"always" | "never">("never");

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig reducedMotion={reduced()}>
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue!.isReducedMotion()).toBe(false);

      setReduced("always");
      await vi.advanceTimersByTimeAsync(50);

      expect(configValue!.isReducedMotion()).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles undefined transition", () => {
      let configValue: ReturnType<typeof useMotionConfig> = null;

      const TestComponent = () => {
        configValue = useMotionConfig();
        return <div data-testid="target">Test</div>;
      };

      render(() => (
        <MotionConfig>
          <TestComponent />
        </MotionConfig>
      ));

      expect(configValue!.transition()).toBeUndefined();
    });

    it("renders children correctly", () => {
      render(() => (
        <MotionConfig transition={{ duration: 0.5 }}>
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
        </MotionConfig>
      ));

      expect(screen.getByTestId("child1")).toBeTruthy();
      expect(screen.getByTestId("child2")).toBeTruthy();
    });

    it("works with motion components as children", async () => {
      render(() => (
        <MotionConfig transition={{ duration: 0.5 }}>
          <motion.div
            data-testid="motion-child"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        </MotionConfig>
      ));

      await vi.advanceTimersByTimeAsync(50);
      expect(screen.getByTestId("motion-child")).toBeTruthy();
    });
  });
});
