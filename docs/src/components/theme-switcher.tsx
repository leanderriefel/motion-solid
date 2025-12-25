import { useColorMode } from "@kobalte/core";
import { motion, useLayoutTransition } from "motion-solid";
import { cn } from "~/utils/cn";

export const ThemeSwitcher = () => {
  const { colorMode, setColorMode } = useColorMode();
  let thumb: HTMLDivElement | undefined;
  const transition = useLayoutTransition(() => thumb);

  return (
    <button
      type="button"
      class={cn(
        "w-12 h-6 bg-background border border-border rounded-full p-1 flex items-center shadow-sm",
        "[box-shadow:inset_2px_5px_5px_#dadada,inset_-2px_-5px_5px_#fff] dark:[box-shadow:inset_2px_5px_5px_#000,inset_-2px_-5px_5px_#111111]",
        {
          "justify-start": colorMode() === "light",
          "justify-end": colorMode() === "dark",
        },
      )}
      onClick={() =>
        transition(() =>
          setColorMode(colorMode() === "light" ? "dark" : "light"),
        )
      }
    >
      <motion.div
        ref={(el) => {
          thumb = el;
        }}
        layout
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
        class={cn("size-4 rounded-full shadow-md bg-foreground")}
      />
    </button>
  );
};
