import { A, useLocation, useMatch } from "@solidjs/router";
import {
  ParentProps,
  createEffect,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { Logo } from "~/components/logo";
import { AiFillGithub } from "solid-icons/ai";
import { cn } from "~/utils/cn";
import { BackgroundDots } from "~/components/background-dots";
import { ThemeSwitcher } from "~/components/theme-switcher";
import { useColorMode } from "@kobalte/core";

type TocItem = {
  id: string;
  text: string;
  level: number;
};

const docsNav = [
  {
    title: "Getting Started",
    items: [
      { href: "/docs/getting-started", label: "Getting Started" },
      { href: "/docs/demos", label: "Demos" },
      { href: "/docs/caveats", label: "Caveats" },
    ],
  },
  {
    title: "Core",
    items: [
      { href: "/docs/motion-component", label: "motion" },
      { href: "/docs/variants", label: "Variants" },
      { href: "/docs/animate-presence", label: "AnimatePresence" },
      { href: "/docs/motion-config", label: "MotionConfig" },
    ],
  },
  {
    title: "Interaction",
    items: [
      { href: "/docs/gestures", label: "Gestures" },
      { href: "/docs/drag", label: "Drag" },
    ],
  },
  {
    title: "Layout",
    items: [{ href: "/docs/layout", label: "Layout" }],
  },
  {
    title: "Reference",
    items: [{ href: "/docs/api-reference", label: "API Reference" }],
  },
];

export default function Layout(props: ParentProps) {
  const isDocsPage = useMatch(() => "/docs/*");
  const location = useLocation();
  const [tocItems, setTocItems] = createSignal<TocItem[]>([]);
  const { colorMode } = useColorMode();

  createEffect(() => {
    // oxlint-disable-next-line no-unused-expressions
    location.pathname;

    if (!isDocsPage()) {
      setTocItems([]);
      return;
    }
    if (typeof document === "undefined") return;

    const updateToc = () => {
      const root = document.querySelector(".docs-content");
      if (!root) {
        setTocItems([]);
        return;
      }

      const headings = Array.from(root.querySelectorAll("h2, h3"));
      const items = headings
        .map((heading) => {
          const text = heading.textContent?.trim() ?? "";
          if (!text) return null;
          const id = heading.id || slugify(text);
          if (!heading.id) heading.id = id;
          return {
            id,
            text,
            level: heading.tagName === "H2" ? 2 : 3,
          };
        })
        .filter((item): item is TocItem => item !== null);

      setTocItems(items);
    };

    // Initial check
    const raf = requestAnimationFrame(updateToc);

    // Watch for content changes (MDX loading, etc.)
    const root = document.querySelector(".docs-content");
    let observer: MutationObserver | undefined;
    if (root) {
      observer = new MutationObserver(updateToc);
      observer.observe(root, { childList: true, subtree: true });
    }

    onCleanup(() => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    });
  });

  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col relative isolate">
      <header
        class={cn(
          "h-14 px-2.5 flex items-center justify-between fixed top-7 w-full max-w-5xl left-1/2 -translate-x-1/2 bg-foreground/2 rounded-2xl border backdrop-blur-md z-50 pr-4",
          "[box-shadow:inset_5px_5px_10px_#0000001d,inset_-5px_-5px_10px_#ffffff] dark:[box-shadow:inset_5px_5px_10px_#000000e0,inset_-5px_-5px_10px_#ffffff0d]",
        )}
      >
        <A
          href="/"
          class="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
        >
          <div class="bg-primary hover:bg-foreground hover:fill-background fill-primary-foreground transition-colors rounded-lg p-1.5">
            <Logo class="size-6" />
          </div>
        </A>
        <nav class="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
          <A
            href="/docs/getting-started"
            class="hover:text-primary"
            activeClass="text-primary"
          >
            Docs
          </A>
          <ThemeSwitcher />
          <a
            href="https://github.com/leanderriefel/motion-solid"
            target="_blank"
            class="hover:text-foreground"
            aria-label="GitHub"
          >
            <AiFillGithub class="size-7" />
          </a>
        </nav>
      </header>

      <main class="flex-1">
        <Show
          when={isDocsPage()}
          fallback={<div class="mx-auto w-full">{props.children}</div>}
        >
          <div class="mx-auto w-full px-4 py-6 mt-40">
            <div class="grid grid-cols-1 gap-6 place-items-center">
              <nav class="text-sm text-muted-foreground space-y-5 overflow-y-auto text-ellipsis xl:fixed xl:top-52 xl:left-[max(1rem,calc((100vw-64rem)/4))]">
                <For each={docsNav}>
                  {(section) => (
                    <div>
                      <div class="text-xs uppercase tracking-wide mb-2">
                        {section.title}
                      </div>
                      <div class="*:py-0.5">
                        <For each={section.items}>
                          {(item) => (
                            <A
                              href={item.href}
                              class="border-l pl-4 block hover:text-foreground transition-colors"
                              activeClass="text-foreground"
                            >
                              {item.label}
                            </A>
                          )}
                        </For>
                      </div>
                    </div>
                  )}
                </For>
              </nav>

              <div class="docs-content min-w-0 max-w-2xl">
                <div class="not-prose mt-6 rounded-lg border-2 border-red-500/30 bg-red-500/10 p-6 mb-12">
                  <div>
                    <h4 class="font-semibold text-lg mb-1">Beta Status</h4>
                    <p class="text-sm opacity-90">
                      This library is still in early beta and the API is subject
                      to change and may get daily breaking changes. The
                      documentaton may not be up to date with the latest
                      features and include missing or outdated information. You
                      can always create an issue on{" "}
                      <a
                        href="https://github.com/leanderriefel/motion-solid"
                        target="_blank"
                        class="text-primary hover:text-foreground transition-colors"
                      >
                        GitHub
                      </a>{" "}
                      or even better a pull request to fix the documentation or
                      add new features.
                    </p>
                  </div>
                </div>
                {props.children}
              </div>

              <aside class="hidden xl:block text-xs text-muted-foreground">
                <div class="fixed top-52 right-[max(1rem,calc((100vw-64rem)/4))]">
                  <div class="text-xs uppercase tracking-wide mb-2">
                    On this page
                  </div>
                  <div class="*:py-0.5">
                    <For each={tocItems()}>
                      {(item) => (
                        <button
                          onClick={() => {
                            const element = document.getElementById(item.id);
                            if (element) {
                              const headerHeight = 56; // h-14 = 56px
                              const headerTop = 28; // top-7 = 28px
                              const offset = headerHeight + headerTop + 32; // Add 16px padding
                              const elementPosition =
                                element.getBoundingClientRect().top +
                                window.pageYOffset;
                              const offsetPosition = elementPosition - offset;

                              window.scrollTo({
                                top: offsetPosition,
                                behavior: "smooth",
                              });
                              window.history.pushState(null, "", `#${item.id}`);
                            }
                          }}
                          role="link"
                          class={cn(
                            "block cursor-pointer hover:text-foreground transition-colors text-sm",
                            {
                              "border-l pl-4 text-xs": item.level === 3,
                            },
                          )}
                        >
                          {item.text}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </aside>
            </div>
          </div>
          <BackgroundDots opacity={colorMode() === "dark" ? 0.25 : 0.5} />
        </Show>
      </main>
      <div class="fixed h-96 w-40 bg-radial from-primary blur-[96px] rounded-full rotate-240 -top-64 left-20 -z-40" />
      <div class="fixed h-80 w-32 bg-radial from-primary blur-[96px] rounded-full rotate-120 -top-64 left-80 -z-40" />
      <div class="fixed h-96 w-40 bg-radial from-primary blur-[96px] rounded-full rotate-240 -right-52 -bottom-40 -z-40" />
      <div class="fixed h-80 w-32 bg-radial from-primary blur-[96px] rounded-full rotate-120 -right-64 bottom-8 -z-40" />
    </div>
  );
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
