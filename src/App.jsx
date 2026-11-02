import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Staff from "./Staff";
import Fingerboard from "./Fingerboard";
import { KEYS, POSITIONS, STRINGS, noteName, notePool } from "./music";
import { playNote } from "./audio";
import { startListening } from "./pitch";
import styles from "./App.module.css";

const DEFAULTS = {
  keyId: "G",
  positionId: 1,
  strings: [0, 1, 2, 3],
  order: "random",
  alwaysShow: false,
  autoPlay: true,
};

const NOTE_DURATION = 1.4;
const HOLD_MS = 300;
const TOLERANCE_CENTS = 35;
const GRACE_MS = 150;
const CHROMATIC = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("violin-settings")) };
  } catch {
    return DEFAULTS;
  }
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState(null);
  const [heard, setHeard] = useState(null);
  const [matched, setMatched] = useState(false);
  const [count, setCount] = useState(0);

  const keyDef = KEYS.find((k) => k.id === settings.keyId);
  const position = POSITIONS.find((p) => p.id === settings.positionId);
  const pool = useMemo(
    () => notePool(keyDef, position, settings.strings),
    [keyDef, position, settings.strings]
  );
  const note = pool[Math.min(index, pool.length - 1)];

  const dirRef = useRef(1);
  const targetRef = useRef(null);
  const lockRef = useRef(false);
  const ignoreUntilRef = useRef(0);
  const holdRef = useRef({ since: null, lastGood: 0 });
  const nextRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem("violin-settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    setIndex(0);
    dirRef.current = 1;
    setRevealed(false);
  }, [pool]);

  useEffect(() => {
    targetRef.current = note?.midi ?? null;
  }, [note]);

  const play = useCallback((midi) => {
    ignoreUntilRef.current = performance.now() + NOTE_DURATION * 1000 + 250;
    holdRef.current = { since: null, lastGood: 0 };
    playNote(midi, NOTE_DURATION);
  }, []);

  const next = useCallback(() => {
    if (pool.length === 0) return;
    let nextIndex = index;
    if (settings.order === "scale") {
      if (pool.length > 1) {
        if (index + dirRef.current >= pool.length || index + dirRef.current < 0) {
          dirRef.current *= -1;
        }
        nextIndex = index + dirRef.current;
      }
    } else if (pool.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * pool.length);
      } while (nextIndex === index);
    }
    setIndex(nextIndex);
    setRevealed(false);
    setMatched(false);
    lockRef.current = false;
    holdRef.current = { since: null, lastGood: 0 };
    if (settings.autoPlay) play(pool[nextIndex].midi);
  }, [pool, index, settings.order, settings.autoPlay, play]);

  nextRef.current = next;

  const onPitch = useCallback((midi) => {
    const now = performance.now();
    if (now < ignoreUntilRef.current || lockRef.current) {
      setHeard(null);
      return;
    }
    setHeard(midi);
    const target = targetRef.current;
    const hold = holdRef.current;
    const inTune = midi !== null && target !== null && Math.abs(midi - target) * 100 <= TOLERANCE_CENTS;
    if (inTune) {
      hold.lastGood = now;
      if (hold.since === null) hold.since = now;
      if (now - hold.since >= HOLD_MS) {
        lockRef.current = true;
        setMatched(true);
        setCount((c) => c + 1);
        setTimeout(() => nextRef.current(), 900);
      }
    } else if (now - hold.lastGood > GRACE_MS) {
      hold.since = null;
    }
  }, []);

  useEffect(() => {
    if (!listening) {
      setHeard(null);
      return;
    }
    let stop = null;
    let cancelled = false;
    startListening(onPitch)
      .then((fn) => {
        if (cancelled) fn();
        else stop = fn;
      })
      .catch(() => {
        setMicError("Microphone access was blocked.");
        setListening(false);
      });
    return () => {
      cancelled = true;
      if (stop) stop();
    };
  }, [listening, onPitch]);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));

  const toggleString = (i) => {
    const has = settings.strings.includes(i);
    if (has && settings.strings.length === 1) return;
    update({
      strings: has
        ? settings.strings.filter((s) => s !== i)
        : [...settings.strings, i].sort(),
    });
  };

  const cents =
    heard !== null && note ? Math.max(-100, Math.min(100, (heard - note.midi) * 100)) : null;
  const heardName = heard !== null ? CHROMATIC[((Math.round(heard) % 12) + 12) % 12] : null;
  const showHints = settings.alwaysShow || revealed;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Violin</h1>
        <p>Read the note, find it on the fingerboard, play it.</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.card}>
          {note ? (
            <>
              <Staff note={note} keyDef={keyDef} matched={matched} />
              <div className={styles.answer}>
                {showHints ? (
                  <>
                    <span className={styles.noteName}>
                      {noteName(note)}
                      {note.octave}
                    </span>
                    <span>
                      {STRINGS[note.string].name} string,{" "}
                      {note.finger === 0 ? "open" : `finger ${note.finger}`}
                    </span>
                  </>
                ) : (
                  <span className={styles.hidden}>What note is this?</span>
                )}
              </div>
              <div className={styles.controls}>
                <button className={styles.primary} onClick={() => play(note.midi)}>
                  ▶ Hear it
                </button>
                <button onClick={() => setRevealed((r) => !r)}>
                  {showHints ? "Hide" : "Show answer"}
                </button>
                <button onClick={next}>Next →</button>
              </div>

              <div className={styles.listen}>
                <button
                  className={listening ? styles.on : ""}
                  onClick={() => {
                    setMicError(null);
                    setListening((l) => !l);
                  }}
                >
                  🎤 {listening ? "Listening: stop" : "Play along: use mic"}
                </button>
                {micError && <span className={styles.error}>{micError}</span>}
                {listening && (
                  <div className={styles.meter} aria-hidden="true">
                    <div className={styles.meterZone} />
                    {cents !== null && (
                      <div
                        className={styles.needle}
                        style={{ left: `${50 + cents / 2}%` }}
                        data-good={Math.abs(cents) <= TOLERANCE_CENTS}
                      />
                    )}
                  </div>
                )}
                {listening && (
                  <p className={styles.heard}>
                    {matched
                      ? "Got it!"
                      : heardName
                        ? `Hearing ${heardName}${cents > TOLERANCE_CENTS ? " (sharp)" : cents < -TOLERANCE_CENTS ? " (flat)" : ""}`
                        : "Play the note and hold it"}
                  </p>
                )}
                {count > 0 && <p className={styles.heard}>Matched: {count}</p>}
              </div>
            </>
          ) : (
            <p>No notes of this key fit in that position on the selected strings.</p>
          )}
        </section>

        <section className={styles.card}>
          {note && <Fingerboard note={note} pool={pool} show={showHints} />}
          <p className={styles.caption}>
            Faint dots: every note of the key in this position. Left is the G string.
          </p>
        </section>
      </div>

      <section className={`${styles.card} ${styles.settings}`}>
        <label>
          Key
          <select value={settings.keyId} onChange={(e) => update({ keyId: e.target.value })}>
            {KEYS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.id.replace("b", "♭")} major
              </option>
            ))}
          </select>
        </label>
        <label>
          Position
          <select
            value={settings.positionId}
            onChange={(e) => update({ positionId: Number(e.target.value) })}
          >
            {POSITIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Order
          <select value={settings.order} onChange={(e) => update({ order: e.target.value })}>
            <option value="random">Random notes</option>
            <option value="scale">Scale up and down</option>
          </select>
        </label>
        <fieldset>
          <legend>Strings</legend>
          {STRINGS.map((s, i) => (
            <label key={s.name} className={styles.check}>
              <input
                type="checkbox"
                checked={settings.strings.includes(i)}
                onChange={() => toggleString(i)}
              />
              {s.name}
            </label>
          ))}
        </fieldset>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.autoPlay}
            onChange={(e) => update({ autoPlay: e.target.checked })}
          />
          Play each new note aloud
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.alwaysShow}
            onChange={(e) => update({ alwaysShow: e.target.checked })}
          />
          Always show string and finger
        </label>
      </section>
      <p className={styles.footnote}>
        Use headphones with the mic so the app does not hear its own playback.
      </p>
    </div>
  );
}
