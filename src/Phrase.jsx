import { useCallback, useEffect, useRef, useState } from "react";
import Staff from "./Staff";
import Fingerboard from "./Fingerboard";
import { STRINGS, generatePhrase, noteName } from "./music";
import { click, getContext, playNote } from "./audio";
import { useMic } from "./useMic";
import styles from "./App.module.css";

const COUNT_IN = 4;
const TOLERANCE_CENTS = 40;
// Players land slightly after the beat, and mic and speaker add latency.
const LAG = 0.12;

const needed = (run) => Math.min(0.25, run.beat * 0.35);

export default function Phrase({ keyDef, pool, settings }) {
  const [phrase, setPhrase] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [count, setCount] = useState(0);
  const [cursor, setCursor] = useState(-1);
  const [results, setResults] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState(null);

  const runRef = useRef(null);
  const rafRef = useRef(0);
  const phraseRef = useRef([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    runRef.current = null;
    setPhase("idle");
    setCount(0);
    setCursor(-1);
  }, []);

  const newPhrase = useCallback(() => {
    stop();
    setResults([]);
    setRevealed(false);
    const p = generatePhrase(pool, keyDef, settings.phraseLen);
    phraseRef.current = p;
    setPhrase(p);
  }, [pool, keyDef, settings.phraseLen, stop]);

  useEffect(() => {
    newPhrase();
  }, [newPhrase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const tick = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    const now = getContext().currentTime;
    const el = now - run.noteStart;

    if (el < 0) {
      setCount(now < run.t0 ? 0 : Math.floor((now - run.t0) / run.beat) + 1);
      setCursor(-1);
    } else {
      setCount(0);
      setPhase("run");
      const idx = Math.floor(el / run.beat);
      setCursor(idx < run.n ? idx : -1);

      if (run.mode === "play") {
        const graded = Math.min(Math.floor((el - LAG) / run.beat), run.n);
        let changed = false;
        for (let i = 0; i < graded; i++) {
          if (run.final[i] === null) {
            run.final[i] = run.acc[i] >= needed(run) ? "hit" : "miss";
            changed = true;
          }
        }
        if (changed) setResults(run.final.slice());
      }

      const end = run.n * run.beat + (run.mode === "play" ? LAG : 0);
      if (el >= end) {
        runRef.current = null;
        setCursor(-1);
        setPhase(run.mode === "play" ? "done" : "idle");
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = (mode) => {
    const p = phraseRef.current;
    if (!p.length) return;
    stop();
    setResults([]);
    const ac = getContext();
    const beat = 60 / settingsRef.current.bpm;
    const t0 = ac.currentTime + 0.2;
    const countBeats = mode === "play" ? COUNT_IN : 0;
    const noteStart = t0 + countBeats * beat;
    const rel = (t) => t - ac.currentTime;

    if (mode === "play") {
      for (let k = 0; k < COUNT_IN; k++) click(rel(t0 + k * beat), k === 0);
      if (settingsRef.current.click) {
        for (let i = 0; i < p.length; i++) click(rel(noteStart + i * beat), i % 4 === 0);
      }
    } else {
      p.forEach((n, i) => playNote(n.midi, beat * 0.95, rel(noteStart + i * beat)));
    }

    runRef.current = {
      mode,
      t0,
      noteStart,
      beat,
      n: p.length,
      acc: new Array(p.length).fill(0),
      final: new Array(p.length).fill(null),
      lastT: null,
    };
    setPhase(mode === "play" ? "count" : "run");
    rafRef.current = requestAnimationFrame(tick);
  };

  const onPitch = useCallback((midi) => {
    const run = runRef.current;
    if (!run || run.mode !== "play") return;
    const now = getContext().currentTime;
    const dt = run.lastT === null ? 0 : Math.min(now - run.lastT, 0.1);
    run.lastT = now;
    const idx = Math.floor((now - run.noteStart - LAG) / run.beat);
    if (idx < 0 || idx >= run.n || midi === null) return;
    if (Math.abs(midi - phraseRef.current[idx].midi) * 100 <= TOLERANCE_CENTS) run.acc[idx] += dt;
  }, []);

  useMic(listening, onPitch, () => {
    setMicError("Microphone access was blocked.");
    setListening(false);
  });

  const running = phase === "count" || phase === "run";
  const showHints = settings.alwaysShow || revealed;
  const statuses = phrase.map((_, i) => results[i] || (i === cursor ? "active" : "idle"));
  const labels = showHints
    ? phrase.map((n) => ({
        name: `${noteName(n)}${n.octave}`,
        where: `${STRINGS[n.string].name} ${n.finger === 0 ? "open" : n.finger}`,
      }))
    : null;
  const boardNote = phrase[cursor >= 0 ? cursor : 0];
  const hits = results.filter((r) => r === "hit").length;

  let status = "Hear it first, then play along with the count-in.";
  if (phase === "count") status = count > 0 ? String(count) : "Get ready";
  else if (phase === "run") status = runRef.current?.mode === "hear" ? "Listen" : "Play!";
  else if (phase === "done") {
    status = listening ? `${hits} of ${phrase.length} in tune` : "Done. Turn on the mic to get scored.";
  }

  return (
    <div className={styles.layout}>
      <section className={styles.card}>
        {phrase.length ? (
          <>
            <Staff notes={phrase} keyDef={keyDef} statuses={statuses} labels={labels} />
            <p className={styles.status} data-big={phase === "count"}>
              {status}
            </p>
            <div className={styles.controls}>
              <button disabled={running} onClick={() => start("hear")}>
                ▶ Hear it
              </button>
              {running ? (
                <button className={styles.primary} onClick={() => { stop(); setResults([]); }}>
                  ■ Stop
                </button>
              ) : (
                <button className={styles.primary} onClick={() => start("play")}>
                  ● Play along
                </button>
              )}
              <button onClick={() => setRevealed((r) => !r)}>
                {showHints ? "Hide answer" : "Show answer"}
              </button>
              <button disabled={running} onClick={newPhrase}>
                New phrase
              </button>
            </div>
            <div className={styles.listen}>
              <button
                className={listening ? styles.on : ""}
                onClick={() => {
                  setMicError(null);
                  setListening((l) => !l);
                }}
              >
                🎤 {listening ? "Scoring on: stop" : "Score me: use mic"}
              </button>
              {micError && <span className={styles.error}>{micError}</span>}
            </div>
          </>
        ) : (
          <p>No notes of this key fit in that position on the selected strings.</p>
        )}
      </section>
      <section className={styles.card}>
        {boardNote && <Fingerboard note={boardNote} pool={pool} show={showHints} />}
        <p className={styles.caption}>Left is the G string.</p>
      </section>
    </div>
  );
}
