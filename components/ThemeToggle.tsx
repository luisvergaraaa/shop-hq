"use client";
import { Icon } from "./Icon";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  }
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label="Switch light or dark mode">
      <Icon name="sun" />
    </button>
  );
}
