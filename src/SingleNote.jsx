import { useCallback, useEffect, useRef, useState } from "react";
import Staff from "./Staff";
import Fingerboard from "./Fingerboard";
import MicButton from "./MicButton";
import { STRINGS, fingerText, noteName } from "./music.js";
import { createBus, playNote } from "./audio.js";
import { useMic } from "./useMic";
import styles from "./App.module.css";

const NOTE_DURATION = 1.4;
const HOLD_MS = 300;
const TOLERANCE_CENTS = 35;
const GRACE_MS = 150;
const ADVANCE_MS = 900;
const CHROMATIC = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

const randomIndex = (length, not) => {
  if (length < 2) return 0;
  let i;
  do {
    i = Math.floor(Math.random() * length);
  } while (i === not);
  return i;
};

export default function SingleNote({ keyDef, pool, settings, mic }) {
  const [index, setIndex] = useState(() =>
    settings.order === "scale" ? 0 : randomIndex(pool.length)
  );
  const [revealed, setRevealed] = useState(false);
  const [heard, setHeard] = useState(null);
  const [matched, setMatched] = useState(false);
  const [count, setCount] = useState(0);

  const note = pool[Math.min(index, pool.length - 1)];

  const dirRef = useRef(1);
  const targetRef = useRef(null);
  const lockRef = useRef(false);
  const ignoreUntilRef = useRef(0);
  const holdRef = useRef({ since: null, lastGood: 0 });
  const nextRef = useRef(null);
  const advanceRef = useRef(0);
  const busRef = useRef(null);
  targetRef.current = note?.midi ?? null;

  const clearRound = useCallback(() => {
    clearTimeout(advanceRef.current);
    lockRef.current = false;
    holdRef.current = { since: null, lastGood: 0 };
    setRevealed(false);
    setMatched(false);
  }, []);

  const silence = useCallback(() => {
    busRef.current?.cancel();
    busRef.current = null;
  }, []);

  useEffect(() => {
    clearRound();
    dirRef.current = 1;
    setIndex(settings.order === "scale" ? 0 : randomIndex(pool.length));
  }, [pool, settings.order, clearRound]);

  useEffect(
    () => () => {
      clearTimeout(advanceRef.current);
      silence();
    },
    [silence]
  );

  const play = useCallback(
    (midi) => {
      silence();
      busRef.current = createBus();
      ignoreUntilRef.current = performance.now() + NOTE_DURATION * 1000 + 250;
      holdRef.current = { since: null, lastGood: 0 };
      playNote(midi, NOTE_DURATION, 0, busRef.current.node);
    },
    [silence]
  );

  const next = () => {
    if (pool.length === 0) return;
    let nextIndex;
    if (settings.order === "scale") {
      if (index + dirRef.current >= pool.length || index + dirRef.current < 0) dirRef.current *= -1;
      nextIndex = pool.length > 1 ? index + dirRef.current : 0;
    } else {
      nextIndex = randomIndex(pool.length, index);
    }
    clearRound();
    setIndex(nextIndex);
    if (settings.autoPlay) play(pool[nextIndex].midi);
  };
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
        advanceRef.current = setTimeout(() => nextRef.current(), ADVANCE_MS);
      }
    } else if (now - hold.lastGood > GRACE_MS) {
      hold.since = null;
    }
  }, []);

  useMic(mic.listening, onPitch, mic.fail);

  useEffect(() => {
    if (!mic.listening) setHeard(null);
  }, [mic.listening]);

  if (!note) return <p>No notes of this key fit in that position on the selected strings.</p>;

  const cents = heard !== null ? Math.max(-100, Math.min(100, (heard - note.midi) * 100)) : null;
  const heardName = heard !== null ? CHROMATIC[((Math.round(heard) % 12) + 12) % 12] : null;
  const showHints = settings.alwaysShow || revealed;

  let tuning = "Play the note and hold it";
  if (matched) tuning = "Got it!";
  else if (heardName) {
    const offBy = cents > TOLERANCE_CENTS ? " (sharp)" : cents < -TOLERANCE_CENTS ? " (flat)" : "";
    tuning = `Hearing ${heardName}${offBy}`;
  }

  return (
    <div className={styles.layout}>
      <section className={styles.card}>
        <Staff notes={[note]} keyDef={keyDef} statuses={[matched ? "hit" : "idle"]} />
        <div className={styles.answer}>
          {showHints ? (
            <>
              <span className={styles.noteName}>
                {noteName(note)}
                {note.octave}
              </span>
              <span>
                {STRINGS[note.string].name} string
                {note.finger === 0 ? ", open" : `, finger ${fingerText(note)}`}
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
          <button onClick={() => setRevealed((r) => !r)}>{showHints ? "Hide" : "Show answer"}</button>
          <button onClick={next}>Next →</button>
        </div>

        <div className={styles.listen}>
          <MicButton mic={mic} offLabel="Play along: use mic" onLabel="Listening: stop" />
          {mic.listening && (
            <>
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
              <p className={styles.heard}>{tuning}</p>
            </>
          )}
          {count > 0 && <p className={styles.heard}>Matched: {count}</p>}
        </div>
      </section>

      <section className={styles.card}>
        <Fingerboard note={note} pool={pool} show={showHints} />
        <p className={styles.caption}>
          Faint dots: every note of the key in this position. Left is the G string.
        </p>
      </section>
    </div>
  );
}
