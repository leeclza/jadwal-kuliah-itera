"use client";

import { useEffect } from "react";

export const HEARTBEAT_MS = 20_000;

/** Kirim heartbeat selama tab terlihat; tandai offline saat tab disembunyikan/ditutup. */
export function Presence() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const ping = () => fetch("/api/presence", { method: "POST", body: "{}", keepalive: true }).catch(() => {});
    const offline = () => navigator.sendBeacon("/api/presence", JSON.stringify({ offline: true }));
    const sync = () => {
      clearInterval(timer);
      if (document.visibilityState === "visible") {
        ping();
        timer = setInterval(ping, HEARTBEAT_MS);
      } else offline();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", offline);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", offline);
    };
  }, []);
  return null;
}
