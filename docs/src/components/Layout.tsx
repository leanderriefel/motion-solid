import { A, useLocation, useMatch } from "@solidjs/router";
import {
  ParentProps,
  createEffect,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { Logo } from "~/components/Logo";
import { AiFillGithub } from "solid-icons/ai";

type TocItem = {
  id: string;
  text: string;
  level: number;
};

const docsNav = [
  {
    title: "Getting Started",
    items: [
      { href: "/docs/introduction", label: "Introduction" },
      { href: "/docs/demos", label: "Demos" },
      { href: "/docs/installation", label: "Installation" },
    ],
  },
  {
    title: "Components",
    items: [
      { href: "/docs/motion", label: "Motion" },
      { href: "/docs/presence", label: "Presence" },
    ],
  },
  {
    title: "Animation",
    items: [
      { href: "/docs/transitions", label: "Transitions" },
      { href: "/docs/gestures", label: "Gestures" },
      { href: "/docs/variants", label: "Variants" },
    ],
  },
];

export default function Layout(props: ParentProps) {
  const isDocsPage = useMatch(() => "/docs/*");
  const location = useLocation();
  const [tocItems, setTocItems] = createSignal<TocItem[]>([]);

  createEffect(() => {
    location.pathname;
    if (!isDocsPage()) {
      setTocItems([]);
      return;
    }
    if (typeof document === "undefined") return;

    const raf = requestAnimationFrame(() => {
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
          heading.id = id;
          return {
            id,
            text,
            level: heading.tagName === "H2" ? 2 : 3,
          };
        })
        .filter((item): item is TocItem => item !== null);

      setTocItems(items);
    });

    onCleanup(() => cancelAnimationFrame(raf));
  });

  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col">
      <header class="h-14 px-2.5 flex items-center justify-between fixed top-7 w-full max-w-5xl left-1/2 -translate-x-1/2 bg-foreground/2 rounded-2xl border backdrop-blur-md z-50 pr-4">
        <A
          href="/"
          class="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
        >
          <div class="bg-primary hover:bg-foreground hover:text-background text-primary-foreground transition-colors rounded-lg p-1.5">
            <Logo class="size-6" />
          </div>
        </A>
        <nav class="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
          <A
            href="/docs/introduction"
            class="hover:text-primary"
            activeClass="text-primary"
          >
            Docs
          </A>
          <a
            href="https://github.com/leander/motion-solid"
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
          <div class="mx-auto w-full max-w-5xl px-4 py-6 mt-24">
            <div class="grid grid-cols-1 lg:grid-cols-[160px_minmax(0,1fr)_160px] gap-6">
              <nav class="text-xs text-muted-foreground space-y-5 lg:sticky lg:top-32 self-start">
                <For each={docsNav}>
                  {(section) => (
                    <div>
                      <div class="text-[11px] uppercase tracking-wide mb-2">
                        {section.title}
                      </div>
                      <div class="space-y-1">
                        <For each={section.items}>
                          {(item) => (
                            <A
                              href={item.href}
                              class="block hover:text-foreground transition-colors"
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

              <div class="docs-content min-w-0 ">
                <div class="mt-6 rounded-lg border-2 border-red-500/30 bg-red-500/10 p-6 mb-12">
                  <div>
                    <h3 class="font-semibold text-lg mb-1">Work in Progress</h3>
                    <p class="text-sm opacity-90">
                      The documentation is still being written. This library is
                      in very early beta mode and many features may be broken or
                      incomplete. Use with caution and expect breaking changes.
                    </p>
                  </div>
                </div>
                {props.children}
              </div>

              <aside class="hidden lg:block text-xs text-muted-foreground">
                <div class="lg:sticky lg:top-32">
                  <div class="text-[11px] uppercase tracking-wide mb-2">
                    On this page
                  </div>
                  <div class="space-y-1">
                    <For each={tocItems()}>
                      {(item) => (
                        <a
                          href={`#${item.id}`}
                          class={`block hover:text-foreground transition-colors ${
                            item.level === 3 ? "ml-3" : ""
                          }`}
                        >
                          {item.text}
                        </a>
                      )}
                    </For>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </Show>
      </main>
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
