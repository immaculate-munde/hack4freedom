"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../contexts/language-context";
import { isOnline } from "../lib/network";

const INSTALL_DISMISS_KEY = "pesasense.install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallMode = "installed" | "ios" | "prompt";

const promptSubscribers = new Set<(event: BeforeInstallPromptEvent | null) => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;

function publishPrompt(event: BeforeInstallPromptEvent | null) {
  deferredPrompt = event;
  promptSubscribers.forEach((notify) => notify(event));
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    publishPrompt(event as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => publishPrompt(null));
}

function runningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const ios = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || ios.standalone === true;
}

function isIosBrowser(): boolean {
  const ua = window.navigator.userAgent;
  const appleMobile = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return appleMobile || iPadOs;
}

function PwaBanners() {
  const { t } = useI18n();
  const [offline, setOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const sync = () => setOffline(!isOnline());
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const production = process.env.NODE_ENV === "production";
    let cancelled = false;

    function watch(reg: ServiceWorkerRegistration) {
      const worker = reg.installing ?? reg.waiting;
      if (!worker) return;
      const onState = () => {
        if (worker.state !== "installed") return;
        if (navigator.serviceWorker.controller) {
          setRegistration(reg);
          setUpdateReady(true);
          return;
        }
        worker.postMessage({ type: "SKIP_WAITING" });
      };
      worker.addEventListener("statechange", onState);
    }

    if (!production) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (sessionStorage.getItem("pesasense.dev-sw") === "v2") return;
        sessionStorage.setItem("pesasense.dev-sw", "v2");
        window.location.reload();
      });
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register(production ? "/sw.js" : "/sw-dev.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .then((reg) => {
          if (cancelled || !production) return;
          if (reg.waiting && navigator.serviceWorker.controller) {
            setRegistration(reg);
            setUpdateReady(true);
          } else if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          watch(reg);
          reg.addEventListener("updatefound", () => watch(reg));
        })
        .catch(() => {
          // A failed registration leaves the site as a normal tab.
        });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);

    const timer = production
      ? window.setInterval(() => {
          navigator.serviceWorker.getRegistration().then((reg) => {
            reg?.update().catch(() => undefined);
          });
        }, 60 * 60 * 1000)
      : 0;

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      window.clearInterval(timer);
    };
  }, []);

  function applyUpdate() {
    const waiting = registration?.waiting;
    if (!waiting) return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.location.reload();
      },
      { once: true },
    );
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  if (!offline && !updateReady) return null;

  return (
    <div className="pwa-status">
      {offline ? (
        <div className="pwa-banner pwa-banner-offline" role="status">
          <p>{t("common.offlineBanner")}</p>
        </div>
      ) : null}
      {updateReady ? (
        <div className="pwa-banner pwa-banner-update" role="status">
          <p>{t("common.updateReady")}</p>
          <button type="button" className="btn btn-accent" onClick={applyUpdate}>
            {t("common.updateAction")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PwaExperience() {
  return <PwaBanners />;
}

export function InstallAppCard() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<InstallMode>("prompt");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(deferredPrompt);
  const [dismissed, setDismissed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setOffline(!isOnline());
    setDismissed(window.localStorage.getItem(INSTALL_DISMISS_KEY) === "true");
    if (runningStandalone()) setMode("installed");
    else if (isIosBrowser()) setMode("ios");
    setPromptEvent(deferredPrompt);

    function onInstalled() {
      setMode("installed");
      setInstalling(false);
    }
    function onConnectivity() {
      setOffline(!isOnline());
    }

    promptSubscribers.add(setPromptEvent);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onConnectivity);
    window.addEventListener("offline", onConnectivity);
    setReady(true);
    return () => {
      promptSubscribers.delete(setPromptEvent);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onConnectivity);
      window.removeEventListener("offline", onConnectivity);
    };
  }, []);

  function finishChoice(outcome: "accepted" | "dismissed") {
    setInstalling(false);
    publishPrompt(null);
    if (outcome === "dismissed") {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, "true");
      setDismissed(true);
    }
  }

  function openPrompt(event: BeforeInstallPromptEvent) {
    setInstalling(true);
    void event
      .prompt()
      .then(() => event.userChoice)
      .then((choice) => finishChoice(choice.outcome))
      .catch(() => setInstalling(false));
  }

  function install() {
    if (offline || installing) return;
    const event = promptEvent ?? deferredPrompt;
    if (!event) return;
    openPrompt(event);
  }

  if (!ready) return null;

  if (mode === "installed") {
    return (
      <section className="card">
        <h2 className="font-serif text-lg text-pine">{t("settings.installTitle")}</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft">{t("settings.installInstalled")}</p>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{t("settings.installShare")}</p>
      </section>
    );
  }

  if (dismissed) {
    return (
      <section className="card">
        <button
          type="button"
          className="text-sm font-semibold text-pine underline underline-offset-4"
          onClick={() => {
            window.localStorage.removeItem(INSTALL_DISMISS_KEY);
            setDismissed(false);
          }}
        >
          {t("settings.installShow")}
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="font-serif text-lg text-pine">{t("settings.installTitle")}</h2>
      <p className="mt-1 text-sm leading-6 text-ink-soft">{t("settings.installBody")}</p>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{t("settings.installShare")}</p>
      {mode === "ios" ? <p className="mt-2 text-sm leading-6 text-ink-soft">{t("settings.installIos")}</p> : null}
      {offline ? <p className="mt-2 text-sm leading-6 text-ink-soft">{t("settings.installOffline")}</p> : null}
      {mode === "ios" ? null : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={offline || installing}
            onClick={install}
          >
            {installing ? t("settings.installWorking") : t("settings.installAction")}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              window.localStorage.setItem(INSTALL_DISMISS_KEY, "true");
              setDismissed(true);
            }}
          >
            {t("settings.installDismiss")}
          </button>
        </div>
      )}
    </section>
  );
}
