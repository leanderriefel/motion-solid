import { EnterAnimation } from "~/components/enter-animation";
import { ExitAnimation } from "~/components/exit-animation";
import { FirstAnimation } from "~/components/first-animation";
import { HoverAndTapAnimation } from "~/components/hover-and-tap-animation";
import { LayoutAnimation } from "~/components/layout-animation";
import { LayoutUnderlineAnimation } from "~/components/layout-underline-animation";
import { ScrollAnimation } from "~/components/scroll-animation";

export default function Home() {
  return (
    <div class="min-h-screen bg-background text-foreground">
      <div class="mx-auto flex max-w-3xl flex-col items-center gap-12 px-6 py-12">
        <h1 class="text-2xl font-semibold">motion-solid demos</h1>
        <p class="-mt-10 text-sm text-muted-foreground">
          these are taken directly from the{" "}
          <a
            href="https://motion.dev/docs/react"
            target="_blank"
            class="text-primary underline"
          >
            motion.dev docs
          </a>
          .
        </p>
        <FirstAnimation />
        <EnterAnimation />
        <HoverAndTapAnimation />
        <ScrollAnimation />
        <LayoutAnimation />
        <LayoutUnderlineAnimation />
        <ExitAnimation />
      </div>
    </div>
  );
}
