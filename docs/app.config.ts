import { defineConfig } from "@solidjs/start/config";
/* @ts-ignore */
import pkg from "@vinxi/plugin-mdx";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const { default: mdx } = pkg;
export default defineConfig({
  extensions: ["mdx", "md"],
  vite: {
    plugins: [
      mdx.withImports({})({
        jsx: true,
        jsxImportSource: "solid-js",
        providerImportSource: "solid-mdx",
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "motion-solid": fileURLToPath(
          new URL("../package/src/index.ts", import.meta.url),
        ),
      },
    },
  },
});
