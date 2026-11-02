import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Staff from "./Staff";
import Fingerboard from "./Fingerboard";
import MicButton from "./MicButton";
import { STRINGS, fingerText, noteName } from "./music.js";
import { generatePhrase } from "./phrase.js";
import { gradeNote, summarize } from "./scoring.js";
import { click, createBus, getContext, outputDelay, playNote } from "./audio.js";
import { useMic } from "./useMic";
import styles from "./App.module.css";

const COUNT_IN = 4;
// YIN reads the older half of the analyser buffer, so pitch reports trail the sound.
const DETECTOR_DELAY = 0.07;
const TAIL = 0.1;

const STATUS_CLASS = {
  hit: "hit",
  late: "late",
  short: "late",
  flat: "miss",
  sharp: "miss",
  wrong: "miss",
  silent: "miss",
};
const MARKS = { late: "late", short: "short", flat: "flat", sharp: "sharp", wrong: "wrong", silent: "none" };

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 600px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 600px)");
    const onChange = (e) => setNarrow(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

const noteAt = (run, t) =>
  run.notes.findIndex((_, i) => t >= run.starts[i] && t < run.starts[i] + run.lengths[i]);

export default function Phrase({ keyDef, pool, settings, mic }) {
  const [phrase, setPhrase] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [runMode, setRunMode] = useState(null);
  const [count, setCount] = useState(0);
  const [cursor, setCursor] = useState(-1);
  const [results, setResults] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const narrow = useNarrow();

  const runRef = useRef(null);
  const rafRef = useRef(0);
  const busRef = useRef(null);
  const phraseRef = useRef([]);
  const settingsRef = useRef(settings);
  const listeningRef = useRef(mic.listening);
  settingsRef.current = settings;
  listeningRef.current = mic.listening;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    busRef.current?.cancel();
    busRef.current = null;
    runRef.current = null;
    setPhase("idle");
    setCount(0);
    setCursor(-1);
  }, []);

  const newPhrase = useCallback(() => {
    stop();
    setResults([]);
    setRevealed(false);
    const p = generatePhrase(pool, keyDef, settings.bars, settings.rhythm);
    phraseRef.current = p;
    setPhrase(p);
  }, [pool, keyDef, settings.bars, settings.rhythm, stop]);

  useEffect(() => {
    newPhrase();
  }, [newPhrase]);

  useEffect(() => stop, [stop]);

  const finalize = (run, i) => {
    const seconds = run.lengths[i];
    run.final[i] = gradeNote(run.samples[i], run.notes[i].midi, seconds);
  };

  const tick = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    const now = getContext().currentTime;
    const heardNow = now - run.outDelay;
    const el = heardNow - run.noteStart;

    if (el < 0) {
      setCount(heardNow < run.t0 ? 0 : Math.floor((heardNow - run.t0) / run.beat) + 1);
    } else {
      setCount(0);
      setPhase("run");
      setCursor(noteAt(run, el));

      if (run.scored) {
        const graded = el - DETECTOR_DELAY - TAIL;
        let changed = false;
        run.notes.forEach((_, i) => {
          if (run.final[i] === null && graded >= run.starts[i] + run.lengths[i]) {
            finalize(run, i);
            changed = true;
          }
        });
        if (changed) setResults(run.final.slice());
      }

      if (el >= run.total + (run.scored ? DETECTOR_DELAY + TAIL : 0)) {
        runRef.current = null;
        busRef.current = null;
        setCursor(-1);
        setPhase(run.mode === "play" ? "done" : "idle");
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = (mode) => {
    const notes = phraseRef.current;
    if (!notes.length) return;
    stop();
    setResults([]);

    const ac = getContext();
    const bus = createBus();
    busRef.current = bus;
    const beat = 60 / settingsRef.current.bpm;
    const t0 = ac.currentTime + 0.2;
    const noteStart = t0 + (mode === "play" ? COUNT_IN : 0) * beat;
    const rel = (t) => t - ac.currentTime;
    const starts = notes.map((n) => n.beat * beat);
    const lengths = notes.map((n) => n.dur * beat);
    const total = settingsRef.current.bars * 4 * beat;

    if (mode === "play") {
      for (let k = 0; k < COUNT_IN; k++) click(rel(t0 + k * beat), k === 0, bus.node);
      if (settingsRef.current.click) {
        for (let b = 0; b < settingsRef.current.bars * 4; b++) {
          click(rel(noteStart + b * beat), b % 4 === 0, bus.node);
        }
      }
    } else {
      notes.forEach((n, i) => {
        playNote(n.midi, lengths[i] * 0.95, rel(noteStart + starts[i]), bus.node);
      });
    }

    runRef.current = {
      mode,
      t0,
      noteStart,
      beat,
      notes,
      starts,
      lengths,
      total,
      outDelay: outputDelay(),
      scored: mode === "play" && listeningRef.current,
      samples: notes.map(() => []),
      final: new Array(notes.length).fill(null),
      lastT: null,
    };
    setRunMode(mode);
    setPhase(mode === "play" ? "count" : "run");
    rafRef.current = requestAnimationFrame(tick);
  };

  const onPitch = useCallback((midi) => {
    const run = runRef.current;
    if (!run || !run.scored) return;
    const now = getContext().currentTime;
    const dt = run.lastT === null ? 0 : Math.min(now - run.lastT, 0.1);
    run.lastT = now;
    const el = now - run.outDelay - run.noteStart - DETECTOR_DELAY;
    const idx = noteAt(run, el);
    if (idx >= 0) run.samples[idx].push({ t: el - run.starts[idx], midi, dt });
  }, []);

  useMic(mic.listening, onPitch, mic.fail);

  const lines = useMemo(() => {
    const perLine = narrow ? 1 : 2;
    const out = [];
    phrase.forEach((note, index) => {
      const line = Math.floor(note.bar / perLine);
      (out[line] ||= []).push({ note, index });
    });
    return out;
  }, [phrase, narrow]);

  if (phrase.length === 0) {
    return <p>No notes of this key fit in that position on the selected strings.</p>;
  }

  const running = phase === "count" || phase === "run";
  const showHints = settings.alwaysShow || revealed;
  const boardNote = phrase[cursor >= 0 ? cursor : 0];

  let status = "Hear it first, then play along with the count-in.";
  if (phase === "count") status = count > 0 ? String(count) : "Get ready";
  else if (phase === "run") status = runMode === "hear" ? "Listen" : "Play!";
  else if (phase === "done") {
    status = results.length ? summarize(results) : "Done. Turn on the mic to get scored.";
  }

  return (
    <div className={`${styles.layout} ${styles.layoutWide}`}>
      <section className={styles.card}>
        {lines.map((line, l) => (
          <Staff
            key={l}
            phrase
            notes={line.map((e) => e.note)}
            keyDef={keyDef}
            timeSignature={l === 0}
            finalBar={l === lines.length - 1}
            lineWidth={narrow || settings.bars === 1 ? 460 : 720}
            statuses={line.map(({ index }) =>
              results[index] ? STATUS_CLASS[results[index]] : index === cursor ? "active" : "idle"
            )}
            marks={results.length ? line.map(({ index }) => MARKS[results[index]]) : null}
            labels={
              showHints
                ? line.map(({ note }) => ({
                    name: `${noteName(note)}${note.octave}`,
                    string: `on ${STRINGS[note.string].name}`,
                    finger: fingerText(note),
                  }))
                : null
            }
          />
        ))}
        <p className={styles.status} data-big={phase === "count"}>
          {status}
        </p>
        <div className={styles.controls}>
          <button disabled={running} onClick={() => start("hear")}>
            ▶ Hear it
          </button>
          {running ? (
            <button
              className={styles.primary}
              onClick={() => {
                stop();
                setResults([]);
              }}
            >
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
          <MicButton mic={mic} offLabel="Score me: use mic" onLabel="Scoring on: stop" />
        </div>
      </section>
      <section className={styles.card}>
        <Fingerboard note={boardNote} pool={pool} show={showHints} />
        <p className={styles.caption}>Left is the G string.</p>
      </section>
    </div>
  );
}
