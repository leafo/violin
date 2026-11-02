import { useEffect, useRef } from "react";
import { startListening } from "./pitch.js";

export function useMic(enabled, onPitch, onError) {
  const pitchRef = useRef(onPitch);
  const errorRef = useRef(onError);
  pitchRef.current = onPitch;
  errorRef.current = onError;

  useEffect(() => {
    if (!enabled) return;
    let stop = null;
    let cancelled = false;
    startListening((midi) => pitchRef.current(midi))
      .then((fn) => {
        if (cancelled) fn();
        else stop = fn;
      })
      .catch(() => errorRef.current());
    return () => {
      cancelled = true;
      if (stop) stop();
    };
  }, [enabled]);
}
