import { useEffect } from "react";

// Both hands are on the violin during practice, so nothing taps the screen to keep it on.
export function useWakeLock() {
  useEffect(() => {
    if (!navigator.wakeLock) return;
    let lock = null;
    let released = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (released) lock.release();
      } catch {}
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release();
    };
  }, []);
}
