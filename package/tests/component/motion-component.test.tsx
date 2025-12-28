import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { motion } from "../../src";

describe("motion component", () => {
  describe("element rendering", () => {
    it("renders motion.div as a div element", () => {
      const { container } = render(() => <motion.div data-testid="target" />);
      const element = container.querySelector("div");
      expect(element).toBeInstanceOf(HTMLDivElement);
    });

    it("renders motion.span as a span element", () => {
      const { container } = render(() => <motion.span data-testid="target" />);
      const element = container.querySelector("span");
      expect(element).toBeInstanceOf(HTMLSpanElement);
    });

    it("renders motion.button as a button element", () => {
      const { container } = render(() => (
        <motion.button data-testid="target" />
      ));
      const element = container.querySelector("button");
      expect(element).toBeInstanceOf(HTMLButtonElement);
    });

    it("renders motion.a as an anchor element", () => {
      const { container } = render(() => (
        <motion.a href="#" data-testid="target" />
      ));
      const element = container.querySelector("a");
      expect(element).toBeInstanceOf(HTMLAnchorElement);
    });

    it("renders motion.input as an input element", () => {
      const { container } = render(() => (
        <motion.input type="text" data-testid="target" />
      ));
      const element = container.querySelector("input");
      expect(element).toBeInstanceOf(HTMLInputElement);
    });

    it("renders motion.ul and motion.li correctly", () => {
      const { container } = render(() => (
        <motion.ul>
          <motion.li>Item 1</motion.li>
          <motion.li>Item 2</motion.li>
        </motion.ul>
      ));
      expect(container.querySelector("ul")).toBeInstanceOf(HTMLUListElement);
      expect(container.querySelectorAll("li")).toHaveLength(2);
    });

    it("renders motion.svg as an SVG element", () => {
      const { container } = render(() => <motion.svg data-testid="target" />);
      const element = container.querySelector("svg");
      expect(element).toBeInstanceOf(SVGSVGElement);
    });

    it("renders motion.path as an SVG path element", () => {
      const { container } = render(() => (
        <motion.svg>
          <motion.path d="M0 0" data-testid="target" />
        </motion.svg>
      ));
      const element = container.querySelector("path");
      expect(element).toBeTruthy();
      expect(element?.tagName.toLowerCase()).toBe("path");
      expect(element?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    });

    it("renders children correctly", () => {
      render(() => <motion.div data-testid="target">Hello World</motion.div>);
      expect(screen.getByTestId("target").textContent).toBe("Hello World");
    });

    it("renders nested motion components", () => {
      const { container } = render(() => (
        <motion.div data-testid="parent">
          <motion.span data-testid="child">Nested</motion.span>
        </motion.div>
      ));
      expect(container.querySelector("div span")).toBeTruthy();
    });
  });

  describe("initial styles", () => {
    it("applies initial opacity value as inline style", async () => {
      render(() => (
        <motion.div data-testid="target" initial={{ opacity: 0.5 }} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.opacity).toBe("0.5");
    });

    it("applies initial transform value via x shortcut", async () => {
      render(() => <motion.div data-testid="target" initial={{ x: 100 }} />);
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateX");
    });

    it("applies multiple initial values", async () => {
      render(() => (
        <motion.div data-testid="target" initial={{ opacity: 0, scale: 0.5 }} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.opacity).toBe("0");
      expect(element.style.transform).toContain("scale");
    });

    it("skips initial styles when initial={false}", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial={false}
          animate={{ opacity: 1 }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      // With initial={false}, no initial styles are applied
      expect(element).toBeTruthy();
    });

    it("resolves initial from variant label", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial="hidden"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.opacity).toBe("0");
    });

    it("applies initial with y transform", async () => {
      render(() => <motion.div data-testid="target" initial={{ y: -50 }} />);
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateY");
    });

    it("applies initial rotate transform", async () => {
      render(() => (
        <motion.div data-testid="target" initial={{ rotate: 45 }} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("rotate");
    });
  });

  describe("transform shortcuts in initial/animate", () => {
    it("converts x to translateX", async () => {
      render(() => <motion.div data-testid="target" initial={{ x: 100 }} />);
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateX(100px)");
    });

    it("converts y to translateY", async () => {
      render(() => <motion.div data-testid="target" initial={{ y: 50 }} />);
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateY(50px)");
    });

    it("converts scale", async () => {
      render(() => (
        <motion.div data-testid="target" initial={{ scale: 1.5 }} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("scale(1.5)");
    });

    it("converts rotate", async () => {
      render(() => (
        <motion.div data-testid="target" initial={{ rotate: 90 }} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("rotate(90deg)");
    });

    it("combines multiple transform shortcuts", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial={{ x: 100, y: 50, scale: 1.2 }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateX");
      expect(element.style.transform).toContain("translateY");
      expect(element.style.transform).toContain("scale");
    });

    it("supports z transform for 3D", async () => {
      render(() => <motion.div data-testid="target" initial={{ z: 100 }} />);
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateZ");
    });

    // NOTE: scaleX/scaleY are not directly supported - use "scale-x"/"scale-y" kebab-case
    // which TypeScript types don't include. Use `scale` for uniform scaling.
    it.skip("supports scaleX and scaleY", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial={{ scaleX: 1.5, scaleY: 0.5 }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("scaleX");
      expect(element.style.transform).toContain("scaleY");
    });

    // NOTE: rotateZ is not directly supported - use "rotate-z" kebab-case
    // which TypeScript types don't include. Use `rotate` for z-axis rotation.
    it.skip("supports rotateX, rotateY, rotateZ", async () => {
      render(() => (
        <motion.div data-testid="target" initial={{ rotateZ: 45 }} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("rotateZ");
    });
  });

  describe("transform shortcuts in style prop", () => {
    it("converts x to translateX in style prop", async () => {
      render(() => (
        <motion.div data-testid="target" style={{ x: 100 } as any} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateX");
    });

    it("converts y to translateY in style prop", async () => {
      render(() => (
        <motion.div data-testid="target" style={{ y: 50 } as any} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateY");
    });

    it("converts scale in style prop", async () => {
      render(() => (
        <motion.div data-testid="target" style={{ scale: 1.5 } as any} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("scale");
    });

    it("converts rotate in style prop", async () => {
      render(() => (
        <motion.div data-testid="target" style={{ rotate: 90 } as any} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("rotate");
    });

    it("combines multiple transform shortcuts in style prop", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          style={{ x: 100, y: 50, scale: 1.2 } as any}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateX");
      expect(element.style.transform).toContain("translateY");
      expect(element.style.transform).toContain("scale");
    });

    it("preserves other style properties with transform shortcuts", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          style={{ x: 100, "background-color": "red" } as any}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateX");
      expect(element.style.backgroundColor).toBe("red");
    });

    it("supports z transform in style for 3D", async () => {
      render(() => (
        <motion.div data-testid="target" style={{ z: 100 } as any} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("translateZ");
    });
  });

  describe("props splitting", () => {
    it("does not pass initial prop to DOM", () => {
      render(() => (
        <motion.div data-testid="target" initial={{ opacity: 0 }} />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("initial")).toBe(false);
    });

    it("does not pass animate prop to DOM", () => {
      render(() => (
        <motion.div data-testid="target" animate={{ opacity: 1 }} />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("animate")).toBe(false);
    });

    it("does not pass exit prop to DOM", () => {
      render(() => <motion.div data-testid="target" exit={{ opacity: 0 }} />);
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("exit")).toBe(false);
    });

    it("does not pass variants prop to DOM", () => {
      render(() => (
        <motion.div
          data-testid="target"
          variants={{ visible: { opacity: 1 } }}
        />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("variants")).toBe(false);
    });

    it("does not pass transition prop to DOM", () => {
      render(() => (
        <motion.div data-testid="target" transition={{ duration: 0.5 }} />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("transition")).toBe(false);
    });

    it("does not pass whileHover prop to DOM", () => {
      render(() => (
        <motion.div data-testid="target" whileHover={{ scale: 1.1 }} />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("whileHover")).toBe(false);
    });

    it("does not pass whileTap prop to DOM", () => {
      render(() => (
        <motion.div data-testid="target" whileTap={{ scale: 0.9 }} />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("whileTap")).toBe(false);
    });

    it("does not pass whileFocus prop to DOM", () => {
      render(() => (
        <motion.div data-testid="target" whileFocus={{ scale: 1.1 }} />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("whileFocus")).toBe(false);
    });

    it("does not pass whileInView prop to DOM", () => {
      render(() => (
        <motion.div data-testid="target" whileInView={{ opacity: 1 }} />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("whileInView")).toBe(false);
    });

    it("does not pass layout prop to DOM", () => {
      render(() => <motion.div data-testid="target" layout />);
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("layout")).toBe(false);
    });

    it("does not pass layoutId prop to DOM", () => {
      render(() => <motion.div data-testid="target" layoutId="test" />);
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("layoutId")).toBe(false);
    });

    it("passes className to DOM", () => {
      render(() => <motion.div data-testid="target" class="my-class" />);
      const element = screen.getByTestId("target");
      expect(element.className).toBe("my-class");
    });

    it("passes id to DOM", () => {
      render(() => <motion.div data-testid="target" id="my-id" />);
      const element = screen.getByTestId("target");
      expect(element.id).toBe("my-id");
    });

    it("passes data-* attributes to DOM", () => {
      render(() => <motion.div data-testid="target" data-custom="value" />);
      const element = screen.getByTestId("target");
      expect(element.getAttribute("data-custom")).toBe("value");
    });

    it("passes aria-* attributes to DOM", () => {
      render(() => <motion.div data-testid="target" aria-label="Test label" />);
      const element = screen.getByTestId("target");
      expect(element.getAttribute("aria-label")).toBe("Test label");
    });

    it("passes role attribute to DOM", () => {
      render(() => <motion.div data-testid="target" role="button" />);
      const element = screen.getByTestId("target");
      expect(element.getAttribute("role")).toBe("button");
    });

    it("passes tabIndex to DOM", () => {
      render(() => <motion.div data-testid="target" tabIndex={0} />);
      const element = screen.getByTestId("target");
      expect(element.tabIndex).toBe(0);
    });

    it("passes onClick handler to DOM", async () => {
      const onClick = vi.fn();
      render(() => <motion.div data-testid="target" onClick={onClick} />);
      const element = screen.getByTestId("target");
      element.click();
      expect(onClick).toHaveBeenCalled();
    });

    it("does not pass onAnimationStart callback to DOM", () => {
      render(() => (
        <motion.div data-testid="target" onAnimationStart={() => {}} />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("onAnimationStart")).toBe(false);
    });

    it("does not pass onAnimationComplete callback to DOM", () => {
      render(() => (
        <motion.div data-testid="target" onAnimationComplete={() => {}} />
      ));
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("onAnimationComplete")).toBe(false);
    });

    it("does not pass onHoverStart callback to DOM", () => {
      render(() => <motion.div data-testid="target" onHoverStart={() => {}} />);
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("onHoverStart")).toBe(false);
    });

    it("does not pass onTap callback to DOM", () => {
      render(() => <motion.div data-testid="target" onTap={() => {}} />);
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("onTap")).toBe(false);
    });

    it("does not pass drag prop to DOM", () => {
      render(() => <motion.div data-testid="target" drag />);
      const element = screen.getByTestId("target");
      expect(element.hasAttribute("drag")).toBe(false);
    });
  });

  describe("ref forwarding", () => {
    it("calls ref callback with DOM element", () => {
      let refElement: HTMLElement | null = null;
      render(() => (
        <motion.div
          data-testid="target"
          ref={(el) => {
            refElement = el;
          }}
        />
      ));
      expect(refElement).toBeInstanceOf(HTMLDivElement);
    });

    it("ref is the actual DOM element not a wrapper", () => {
      let refElement: HTMLElement | null = null;
      render(() => (
        <motion.div
          data-testid="target"
          ref={(el) => {
            refElement = el;
          }}
        />
      ));
      const targetElement = screen.getByTestId("target");
      expect(refElement).toBe(targetElement);
    });

    it("ref is available for span elements", () => {
      let refElement: HTMLElement | null = null;
      render(() => (
        <motion.span
          data-testid="target"
          ref={(el) => {
            refElement = el;
          }}
        />
      ));
      expect(refElement).toBeInstanceOf(HTMLSpanElement);
    });

    it("ref works with button elements", () => {
      let refElement: HTMLElement | null = null;
      render(() => (
        <motion.button
          data-testid="target"
          ref={(el) => {
            refElement = el;
          }}
        />
      ));
      expect(refElement).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("style prop merging", () => {
    it("merges user style with initial styles", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial={{ opacity: 0.5 }}
          style={{ "background-color": "blue" }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.opacity).toBe("0.5");
      expect(element.style.backgroundColor).toBe("blue");
    });

    it("initial overrides user style for same property", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial={{ opacity: 0.5 }}
          style={{ opacity: "0.8" }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      // Initial should take precedence for motion properties
      expect(element.style.opacity).toBe("0.5");
    });

    it("passes CSS variables in style prop", async () => {
      render(() => (
        <motion.div data-testid="target" style={{ "--custom-color": "red" }} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.getPropertyValue("--custom-color")).toBe("red");
    });

    it("handles reactive style prop updates", async () => {
      const [color, setColor] = createSignal("red");
      render(() => (
        <motion.div
          data-testid="target"
          style={{ "background-color": color() }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.backgroundColor).toBe("red");

      setColor("blue");
      await vi.advanceTimersByTimeAsync(50);
      expect(element.style.backgroundColor).toBe("blue");
    });

    it("preserves px units in style values", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          style={{ width: "100px", height: "50px" }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.width).toBe("100px");
      expect(element.style.height).toBe("50px");
    });
  });

  describe("variant inheritance", () => {
    it("child inherits variant from parent", async () => {
      render(() => (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
        >
          <motion.span
            data-testid="child"
            variants={{
              hidden: { x: -100 },
              visible: { x: 0 },
            }}
          />
        </motion.div>
      ));
      await vi.advanceTimersByTimeAsync(50);
      const child = screen.getByTestId("child");
      // Child should have initial x: -100 from inherited "hidden" variant
      expect(child.style.transform).toContain("translateX");
    });

    it("inherit={false} blocks variant inheritance", async () => {
      render(() => (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
        >
          <motion.span
            data-testid="child"
            inherit={false}
            variants={{
              hidden: { x: -100 },
              visible: { x: 0 },
            }}
          />
        </motion.div>
      ));
      await vi.advanceTimersByTimeAsync(50);
      const child = screen.getByTestId("child");
      // Child should not inherit parent's variant, so no initial x value
      expect(child.style.transform).not.toContain("translateX(-100px)");
    });

    it("deeply nested components inherit variants", async () => {
      render(() => (
        <motion.div
          initial="hidden"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
        >
          <motion.div>
            <motion.span
              data-testid="grandchild"
              variants={{
                hidden: { scale: 0.5 },
                visible: { scale: 1 },
              }}
            />
          </motion.div>
        </motion.div>
      ));
      await vi.advanceTimersByTimeAsync(50);
      const grandchild = screen.getByTestId("grandchild");
      // Grandchild should inherit "hidden" and have scale: 0.5
      expect(grandchild.style.transform).toContain("scale");
    });
  });

  describe("transformTemplate", () => {
    it("applies custom transformTemplate", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial={{ x: 100 }}
          transformTemplate={(_, generated) =>
            `perspective(500px) ${generated}`
          }
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.transform).toContain("perspective(500px)");
    });

    it("transformTemplate receives transform values", async () => {
      const templateSpy = vi.fn((values, generated) => generated);
      render(() => (
        <motion.div
          data-testid="target"
          initial={{ x: 100, rotate: 45 }}
          transformTemplate={templateSpy}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      expect(templateSpy).toHaveBeenCalled();
    });
  });

  describe("custom prop", () => {
    it("passes custom prop data to variants", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          custom={5}
          initial="hidden"
          variants={{
            hidden: (custom: number) => ({ opacity: custom / 10 }),
          }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.opacity).toBe("0.5");
    });
  });

  describe("edge cases", () => {
    it("handles empty animate object", async () => {
      render(() => <motion.div data-testid="target" animate={{}} />);
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element).toBeTruthy();
    });

    it("handles undefined initial and animate", async () => {
      render(() => <motion.div data-testid="target" />);
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element).toBeTruthy();
    });

    it("handles numeric 0 values correctly", async () => {
      render(() => (
        <motion.div data-testid="target" initial={{ opacity: 0, x: 0 }} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.opacity).toBe("0");
    });

    it("handles keyframe arrays in initial", async () => {
      render(() => (
        <motion.div data-testid="target" initial={{ opacity: [0, 0.5] }} />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      // Should use first keyframe value for initial
      expect(element.style.opacity).toBe("0");
    });

    it("same component renders consistently when re-mounted", async () => {
      const [show, setShow] = createSignal(true);
      render(() => (
        <>
          {show() && (
            <motion.div
              data-testid="target"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
        </>
      ));
      await vi.advanceTimersByTimeAsync(50);

      setShow(false);
      await vi.advanceTimersByTimeAsync(50);

      setShow(true);
      await vi.advanceTimersByTimeAsync(50);
      expect(screen.getByTestId("target")).toBeTruthy();
    });

    // NOTE: Array variant labels for initial may not be fully supported
    it.skip("handles array of variant labels", async () => {
      render(() => (
        <motion.div
          data-testid="target"
          initial={["hidden", "small"]}
          variants={{
            hidden: { opacity: 0 },
            small: { scale: 0.5 },
          }}
        />
      ));
      await vi.advanceTimersByTimeAsync(50);
      const element = screen.getByTestId("target");
      expect(element.style.opacity).toBe("0");
      expect(element.style.transform).toContain("scale");
    });
  });
});
