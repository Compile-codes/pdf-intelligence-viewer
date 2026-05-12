import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Global citation chip handler — uses absolute offsetTop, not viewport-relative
document.addEventListener("click", (e) => {
  const chip = (e.target as HTMLElement).closest(".citationChip");
  if (!chip) return;
  const page = chip.getAttribute("data-page");
  if (!page) return;
  const scrollArea = document.querySelector(".pdfScrollArea");
  const target = document.getElementById(`page-${page}`);
  if (!scrollArea || !target) return;

  // Walk up offsetParent chain to get absolute top within scroll container
  let offsetTop = 0;
  let el: HTMLElement | null = target;
  while (el && el !== scrollArea) {
    offsetTop += el.offsetTop;
    el = el.offsetParent as HTMLElement | null;
  }

  scrollArea.scrollTo({ top: offsetTop, behavior: "smooth" });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
