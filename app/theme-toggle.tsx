"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "atlas-theme";
const THEME_COLORS = { dark: "#050914", light: "#eef2f7" };

/**
 * Runs in <head> before the first paint, so a saved light theme never flashes
 * dark. Dark is the default: the atlas is mostly used outdoors at night.
 * Storage can throw (private windows, file:// in some browsers); then the page
 * simply stays dark.
 */
export const THEME_INIT = `try{if(localStorage.getItem("${KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

type Theme = keyof typeof THEME_COLORS;
const read = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  // The browser chrome colour follows the page, including on first load.
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[theme]);
  }, [theme]);
  const next: Theme = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      className={"theme-toggle " + className}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => {
        if (next === "light") document.documentElement.dataset.theme = "light";
        else delete document.documentElement.dataset.theme;
        try {
          localStorage.setItem(KEY, next);
        } catch {
          // Not persisted; the switch still applies to this visit.
        }
      }}
    >
      {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}
