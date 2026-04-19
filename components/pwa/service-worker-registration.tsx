"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const isHttps = window.location.protocol === "https:";

    if (!isLocalhost && !isHttps) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          { scope: "/" }
        );

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New SW version detected — reload to activate immediately
              window.location.reload();
            }
          });
        });

        // Poll for SW updates every 60 seconds during active sessions
        setInterval(() => registration.update(), 60 * 1000);
      } catch {
        // SW registration failed silently — app still works without it
      }
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }
  }, []);

  return null;
}
