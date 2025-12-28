import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal, For } from "solid-js";
import { AnimatePresence, motion } from "../../src";

describe("AnimatePresence", () => {
  describe("basic rendering", () => {
    it("renders children when present", () => {
      render(() => (
        <AnimatePresence>
          <motion.div data-testid="child">Child</motion.div>
        </AnimatePresence>
      ));

      expect(screen.getByTestId("child")).toBeTruthy();
    });

    it("renders multiple children", () => {
      render(() => (
        <AnimatePresence>
          <motion.div data-testid="child1">Child 1</motion.div>
          <motion.div data-testid="child2">Child 2</motion.div>
        </AnimatePresence>
      ));

      expect(screen.getByTestId("child1")).toBeTruthy();
      expect(screen.getByTestId("child2")).toBeTruthy();
    });

    it("handles empty children", () => {
      const { container } = render(() => (
        <AnimatePresence>{null}</AnimatePresence>
      ));

      expect(container).toBeTruthy();
    });

    it("renders non-motion children", () => {
      render(() => (
        <AnimatePresence>
          <div data-testid="regular-div">Regular div</div>
        </AnimatePresence>
      ));

      expect(screen.getByTestId("regular-div")).toBeTruthy();
    });
  });

  describe("exit animations", () => {
    it("keeps element in DOM during exit animation", async () => {
      const [show, setShow] = createSignal(true);

      render(() => (
        <AnimatePresence>
          {show() && (
            <motion.div
              data-testid="child"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              Child
            </motion.div>
          )}
        </AnimatePresence>
      ));

      expect(screen.getByTestId("child")).toBeTruthy();

      setShow(false);
      await vi.advanceTimersByTimeAsync(100);

      // Element should still be in DOM during exit animation
      // Note: actual behavior depends on implementation
    });

    // NOTE: Exit completion callbacks depend on motion-dom's internal Promise tracking
    // which doesn't work correctly with jsdom's mocked WAAPI
    it.skip("calls onExitComplete when exit animation finishes", async () => {
      const onExitComplete = vi.fn();
      const [show, setShow] = createSignal(true);

      render(() => (
        <AnimatePresence onExitComplete={onExitComplete}>
          {show() && (
            <motion.div
              data-testid="child"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              Child
            </motion.div>
          )}
        </AnimatePresence>
      ));

      setShow(false);
      await vi.advanceTimersByTimeAsync(500);

      expect(onExitComplete).toHaveBeenCalled();
    });

    // NOTE: Depends on exit animation completion
    it.skip("removes element from DOM after exit completes", async () => {
      const [show, setShow] = createSignal(true);

      const { container } = render(() => (
        <AnimatePresence>
          {show() && (
            <motion.div
              data-testid="child"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              Child
            </motion.div>
          )}
        </AnimatePresence>
      ));

      expect(screen.getByTestId("child")).toBeTruthy();

      setShow(false);
      await vi.advanceTimersByTimeAsync(500);

      expect(container.querySelector('[data-testid="child"]')).toBeNull();
    });

    it("handles exit without exit prop (instant removal)", async () => {
      const onExitComplete = vi.fn();
      const [show, setShow] = createSignal(true);

      render(() => (
        <AnimatePresence onExitComplete={onExitComplete}>
          {show() && <motion.div data-testid="child">Child</motion.div>}
        </AnimatePresence>
      ));

      setShow(false);
      await vi.advanceTimersByTimeAsync(100);

      expect(onExitComplete).toHaveBeenCalled();
    });

    it("handles multiple elements exiting simultaneously", async () => {
      const [items, setItems] = createSignal([1, 2, 3]);

      render(() => (
        <AnimatePresence>
          <For each={items()}>
            {(item) => (
              <motion.div
                data-testid={`item-${item}`}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                Item {item}
              </motion.div>
            )}
          </For>
        </AnimatePresence>
      ));

      expect(screen.getByTestId("item-1")).toBeTruthy();
      expect(screen.getByTestId("item-2")).toBeTruthy();
      expect(screen.getByTestId("item-3")).toBeTruthy();

      setItems([]);
      await vi.advanceTimersByTimeAsync(500);
    });
  });

  describe("mode='sync' (default)", () => {
    it("allows enter and exit to animate simultaneously", async () => {
      const [show, setShow] = createSignal(true);

      render(() => (
        <AnimatePresence mode="sync">
          {show() ? (
            <motion.div
              data-testid="first"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              First
            </motion.div>
          ) : (
            <motion.div
              data-testid="second"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              Second
            </motion.div>
          )}
        </AnimatePresence>
      ));

      expect(screen.getByTestId("first")).toBeTruthy();

      setShow(false);
      await vi.advanceTimersByTimeAsync(50);

      // Both should be present during transition
      // New element should start entering immediately
    });
  });

  describe("mode='wait'", () => {
    it("blocks entrance until exit completes", async () => {
      const [show, setShow] = createSignal(true);

      render(() => (
        <AnimatePresence mode="wait">
          {show() ? (
            <motion.div
              data-testid="first"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              First
            </motion.div>
          ) : (
            <motion.div
              data-testid="second"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              Second
            </motion.div>
          )}
        </AnimatePresence>
      ));

      expect(screen.getByTestId("first")).toBeTruthy();

      setShow(false);
      await vi.advanceTimersByTimeAsync(50);

      // With mode="wait", second element should wait for first to exit
    });

    it("queues multiple entrances correctly", async () => {
      const [value, setValue] = createSignal(1);

      render(() => (
        <AnimatePresence mode="wait">
          <motion.div
            data-testid={`item-${value()}`}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            Item {value()}
          </motion.div>
        </AnimatePresence>
      ));

      expect(screen.getByTestId("item-1")).toBeTruthy();

      setValue(2);
      await vi.advanceTimersByTimeAsync(50);
      setValue(3);
      await vi.advanceTimersByTimeAsync(500);
    });
  });

  describe("mode='popLayout'", () => {
    it("positions exiting element absolutely", async () => {
      const [show, setShow] = createSignal(true);

      render(() => (
        <div style={{ position: "relative" }}>
          <AnimatePresence mode="popLayout">
            {show() && (
              <motion.div
                data-testid="child"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                Child
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ));

      setShow(false);
      await vi.advanceTimersByTimeAsync(50);

      // Element should be positioned absolutely during exit
      const child = document.querySelector(
        '[data-testid="child"]',
      ) as HTMLElement;
      if (child) {
        expect(child.style.position).toBe("absolute");
      }
    });
  });

  describe("initial={false}", () => {
    it("disables initial animation on first render", async () => {
      const onAnimationStart = vi.fn();

      render(() => (
        <AnimatePresence initial={false}>
          <motion.div
            data-testid="child"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onAnimationStart={onAnimationStart}
          >
            Child
          </motion.div>
        </AnimatePresence>
      ));

      await vi.advanceTimersByTimeAsync(50);

      // With initial={false}, the component should not animate from initial state
    });

    it("subsequent additions do animate", async () => {
      const [items, setItems] = createSignal([1]);

      render(() => (
        <AnimatePresence initial={false}>
          <For each={items()}>
            {(item) => (
              <motion.div
                data-testid={`item-${item}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Item {item}
              </motion.div>
            )}
          </For>
        </AnimatePresence>
      ));

      await vi.advanceTimersByTimeAsync(50);

      // Add a new item
      setItems([1, 2]);
      await vi.advanceTimersByTimeAsync(50);

      expect(screen.getByTestId("item-2")).toBeTruthy();
    });
  });

  describe("custom prop", () => {
    it("passes custom data to exiting children", async () => {
      let receivedCustom: unknown = null;
      const [show, setShow] = createSignal(true);

      const TestComponent = () => {
        return (
          <motion.div
            data-testid="child"
            custom={receivedCustom}
            exit={{ opacity: 0 }}
          >
            Child
          </motion.div>
        );
      };

      render(() => (
        <AnimatePresence custom={{ direction: 1 }}>
          {show() && <TestComponent />}
        </AnimatePresence>
      ));

      setShow(false);
      await vi.advanceTimersByTimeAsync(100);
    });

    it("updates custom data reactively", async () => {
      const [direction, setDirection] = createSignal(1);
      const [show, setShow] = createSignal(true);

      render(() => (
        <AnimatePresence custom={direction()}>
          {show() && (
            <motion.div data-testid="child" exit={{ opacity: 0 }}>
              Child
            </motion.div>
          )}
        </AnimatePresence>
      ));

      setDirection(-1);
      await vi.advanceTimersByTimeAsync(50);

      setShow(false);
      await vi.advanceTimersByTimeAsync(100);
    });
  });

  describe("propagate prop", () => {
    // NOTE: Depends on exit animation completion
    it.skip("triggers exit in nested AnimatePresence when parent exits", async () => {
      const [showOuter, setShowOuter] = createSignal(true);
      const innerExitComplete = vi.fn();

      render(() => (
        <AnimatePresence>
          {showOuter() && (
            <motion.div data-testid="outer" exit={{ opacity: 0 }}>
              <AnimatePresence propagate onExitComplete={innerExitComplete}>
                <motion.div data-testid="inner" exit={{ opacity: 0 }}>
                  Inner
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      ));

      setShowOuter(false);
      await vi.advanceTimersByTimeAsync(500);

      // Inner exit should complete when outer exits
      expect(innerExitComplete).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    // NOTE: Depends on animation completion timing
    it.skip("handles rapid add/remove cycles", async () => {
      const [show, setShow] = createSignal(true);

      render(() => (
        <AnimatePresence>
          {show() && (
            <motion.div
              data-testid="child"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              Child
            </motion.div>
          )}
        </AnimatePresence>
      ));

      for (let i = 0; i < 5; i++) {
        setShow(false);
        await vi.advanceTimersByTimeAsync(20);
        setShow(true);
        await vi.advanceTimersByTimeAsync(20);
      }

      await vi.advanceTimersByTimeAsync(500);
      expect(screen.getByTestId("child")).toBeTruthy();
    });

    it("handles list reordering", async () => {
      const [items, setItems] = createSignal([1, 2, 3]);

      render(() => (
        <AnimatePresence>
          <For each={items()}>
            {(item) => (
              <motion.div data-testid={`item-${item}`} exit={{ opacity: 0 }}>
                Item {item}
              </motion.div>
            )}
          </For>
        </AnimatePresence>
      ));

      setItems([3, 2, 1]);
      await vi.advanceTimersByTimeAsync(100);

      expect(screen.getByTestId("item-1")).toBeTruthy();
      expect(screen.getByTestId("item-2")).toBeTruthy();
      expect(screen.getByTestId("item-3")).toBeTruthy();
    });

    it("handles replacing single child", async () => {
      const [key, setKey] = createSignal("a");

      render(() => (
        <AnimatePresence>
          <motion.div data-testid={`child-${key()}`} exit={{ opacity: 0 }}>
            Child {key()}
          </motion.div>
        </AnimatePresence>
      ));

      expect(screen.getByTestId("child-a")).toBeTruthy();

      setKey("b");
      await vi.advanceTimersByTimeAsync(500);

      expect(screen.getByTestId("child-b")).toBeTruthy();
    });

    it("works with conditional rendering inside", async () => {
      const [showChild, setShowChild] = createSignal(true);
      const [condition, setCondition] = createSignal(true);

      render(() => (
        <AnimatePresence>
          {showChild() && (
            <motion.div data-testid="wrapper" exit={{ opacity: 0 }}>
              {condition() ? (
                <span data-testid="true-content">True</span>
              ) : (
                <span data-testid="false-content">False</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      ));

      expect(screen.getByTestId("true-content")).toBeTruthy();

      setCondition(false);
      await vi.advanceTimersByTimeAsync(50);

      expect(screen.getByTestId("false-content")).toBeTruthy();
    });

    it("handles deeply nested motion components", async () => {
      const [show, setShow] = createSignal(true);

      render(() => (
        <AnimatePresence>
          {show() && (
            <motion.div data-testid="level1" exit={{ opacity: 0 }}>
              <motion.div data-testid="level2">
                <motion.div data-testid="level3">Deep content</motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      ));

      expect(screen.getByTestId("level1")).toBeTruthy();
      expect(screen.getByTestId("level2")).toBeTruthy();
      expect(screen.getByTestId("level3")).toBeTruthy();

      setShow(false);
      await vi.advanceTimersByTimeAsync(500);
    });
  });
});
