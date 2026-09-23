import "@fontsource/golos-text/400.css";
import "@fontsource/golos-text/500.css";
import "@fontsource/golos-text/600.css";
import "./styles/tokens.css";
import "./styles/themes.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Mobile keyboards shrink the visual viewport but not 100dvh on iOS.
const viewport = window.visualViewport;
if (viewport) {
  const sync = () => document.documentElement.style.setProperty("--app-height", `${viewport.height}px`);
  viewport.addEventListener("resize", sync);
  sync();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
