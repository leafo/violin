import { useEffect, useMemo, useState } from "react";
import SingleNote from "./SingleNote";
import Phrase from "./Phrase";
import Settings from "./Settings";
import { KEYS, POSITIONS, notePool } from "./music.js";
import styles from "./App.module.css";

const DEFAULTS = {
  keyId: "G",
  positionId: 1,
  strings: [0, 1, 2, 3],
  order: "random",
  alwaysShow: false,
  autoPlay: true,
  mode: "note",
  bars: 2,
  rhythm: "quarters",
  bpm: 60,
  click: true,
};

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("violin-settings")) };
  } catch {
    return DEFAULTS;
  }
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState(null);

  const keyDef = KEYS.find((k) => k.id === settings.keyId);
  const position = POSITIONS.find((p) => p.id === settings.positionId);
  const pool = useMemo(
    () => notePool(keyDef, position, settings.strings),
    [keyDef, position, settings.strings]
  );

  useEffect(() => {
    try {
      localStorage.setItem("violin-settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const mic = {
    listening,
    error: micError,
    toggle() {
      setMicError(null);
      setListening((l) => !l);
    },
    fail() {
      setMicError("Microphone access was blocked.");
      setListening(false);
    },
  };

  const Mode = settings.mode === "phrase" ? Phrase : SingleNote;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Violin</h1>
        <p>Read the note, find it on the fingerboard, play it.</p>
      </header>

      <div className={styles.tabs}>
        <button
          className={settings.mode === "note" ? styles.on : ""}
          onClick={() => update({ mode: "note" })}
        >
          Single notes
        </button>
        <button
          className={settings.mode === "phrase" ? styles.on : ""}
          onClick={() => update({ mode: "phrase" })}
        >
          Phrases
        </button>
      </div>

      <Mode keyDef={keyDef} pool={pool} settings={settings} mic={mic} />

      <Settings settings={settings} update={update} />
      <p className={styles.footnote}>
        With the mic on, use wired headphones so it does not hear the app. Bluetooth adds delay that
        can throw off the timing score.
      </p>
    </div>
  );
}
