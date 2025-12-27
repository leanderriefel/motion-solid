import { createMiddleware } from "@solidjs/start/middleware";
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

export default createMiddleware({
  onRequest: [
    async (event) => {
      const url = new URL(event.request.url);
      const acceptHeader = event.request.headers.get("accept") || "";
      const wantsMarkdown =
        url.searchParams.has("raw") || acceptHeader.includes("text/markdown");

      if (wantsMarkdown && url.pathname.startsWith("/docs/")) {
        const slug = url.pathname.replace("/docs/", "").replace(/\/$/, "");

        const docsRoot = resolve(process.cwd(), "src/routes/docs");
        const path = resolve(docsRoot, `${slug}.mdx`);

        if (!path.startsWith(docsRoot + sep)) return;

        if (existsSync(path)) {
          try {
            const content = readFileSync(path, "utf-8");
            return new Response(content, {
              headers: { "Content-Type": "text/markdown" },
            });
          } catch (e) {
            console.error("[Middleware] Error reading markdown file:", e);
          }
        }
      }
    },
  ],
});
