"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../contexts/language-context";

const THEME_KEY = "pesasense.theme";
const LIGHT_CHROME = "#0D7A73";
const DARK_CHROME = "#0e1512";

function readThemePreference(): "light" | "dark" | null {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be blocked. Fall through to the system theme.
  }
  return null;
}

function setThemeColor(dark: boolean) {
  const content = dark ? DARK_CHROME : LIGHT_CHROME;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  setThemeColor(dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // The page still switches for this visit.
  }
}

export function ThemePreferenceSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      const stored = readThemePreference();
      const dark = stored === "dark" || (stored !== "light" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      setThemeColor(dark);
    }
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return null;
}

export function ThemeToggle() {
  const { t } = useI18n();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    applyTheme(next);
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t("common.lightMode") : t("common.darkMode")}
      aria-pressed={dark}
      className="btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-paper text-pine"
    >
      <span className="flex h-5 w-5 items-center justify-center text-pine" aria-hidden="true">
        {dark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M16 3.2A8.5 8.5 0 1 0 20.8 14 7 7 0 0 1 16 3.2z" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" strokeLinecap="round" />
    </svg>
  );
}
