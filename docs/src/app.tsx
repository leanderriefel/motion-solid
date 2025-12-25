import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Layout from "./components/layout";
import "./app.css";
import { getCookie } from "vinxi/http";
import {
  ColorModeProvider,
  ColorModeScript,
  cookieStorageManagerSSR,
} from "@kobalte/core";
import { isServer } from "solid-js/web";
/* @ts-ignore */
import { MDXProvider } from "solid-mdx";
import { CodeBlock } from "./components/code-block";

const getServerCookies = () => {
  "use server";
  const colorMode = getCookie("kb-color-mode");
  return colorMode ? `kb-color-mode=${colorMode}` : "";
};

export default function App() {
  const storageManager = cookieStorageManagerSSR(
    isServer ? getServerCookies() : document.cookie,
  );

  return (
    <Router
      root={(props) => (
        <>
          <ColorModeScript
            storageType={storageManager.type}
            initialColorMode="system"
          />
          <ColorModeProvider
            storageManager={storageManager}
            disableTransitionOnChange
            initialColorMode="system"
          >
            <Layout>
              <MDXProvider components={{ pre: CodeBlock }}>
                <Suspense>{props.children}</Suspense>
              </MDXProvider>
            </Layout>
          </ColorModeProvider>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
