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

        console.log("✅ SW registered, scope:", registration.scope);

        // When a new SW is found, activate it immediately
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // New SW installed and old SW is still controlling the page
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[SW] New version available — reloading for update");
              // Auto-reload to activate new SW immediately
              window.location.reload();
            }
          });
        });

        // Check for SW updates every 60 seconds (useful for long sessions)
        setInterval(() => registration.update(), 60 * 1000);
      } catch (err) {
        console.error("❌ SW registration failed:", err);
      }
    };

    // Register after page load to not block initial render
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }
  }, []);

  return null;
}
