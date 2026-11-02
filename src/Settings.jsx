import { useState } from "react";
import { KEYS, POSITIONS, STRINGS } from "./music.js";
import { NARROW } from "./useMedia";
import styles from "./App.module.css";

function Check({ checked, onChange, children }) {
  return (
    <label className={styles.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export default function Settings({ settings, update }) {
  const phrase = settings.mode === "phrase";
  const [open] = useState(() => !window.matchMedia(NARROW).matches);

  const toggleString = (i) => {
    const has = settings.strings.includes(i);
    if (has && settings.strings.length === 1) return;
    update({
      strings: has ? settings.strings.filter((s) => s !== i) : [...settings.strings, i].sort(),
    });
  };

  return (
    <details className={`${styles.card} ${styles.settingsCard}`} open={open}>
      <summary>Settings</summary>
      <div className={styles.settings}>
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
      {phrase ? (
        <>
          <label>
            Length
            <select value={settings.bars} onChange={(e) => update({ bars: Number(e.target.value) })}>
              <option value={1}>1 bar</option>
              <option value={2}>2 bars</option>
              <option value={4}>4 bars</option>
            </select>
          </label>
          <label>
            Rhythm
            <select value={settings.rhythm} onChange={(e) => update({ rhythm: e.target.value })}>
              <option value="quarters">Quarter notes</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label>
            Tempo: {settings.bpm} bpm
            <input
              type="range"
              min="40"
              max="100"
              step="5"
              value={settings.bpm}
              onChange={(e) => update({ bpm: Number(e.target.value) })}
            />
          </label>
        </>
      ) : (
        <label>
          Order
          <select value={settings.order} onChange={(e) => update({ order: e.target.value })}>
            <option value="random">Random notes</option>
            <option value="scale">Scale up and down</option>
          </select>
        </label>
      )}
      <fieldset>
        <legend>Strings</legend>
        {STRINGS.map((s, i) => (
          <Check key={s.name} checked={settings.strings.includes(i)} onChange={() => toggleString(i)}>
            {s.name}
          </Check>
        ))}
      </fieldset>
      {phrase ? (
        <Check checked={settings.click} onChange={(click) => update({ click })}>
          Metronome click while playing
        </Check>
      ) : (
        <Check checked={settings.autoPlay} onChange={(autoPlay) => update({ autoPlay })}>
          Play each new note aloud
        </Check>
      )}
      <Check checked={settings.alwaysShow} onChange={(alwaysShow) => update({ alwaysShow })}>
        Always show string and finger
      </Check>
      </div>
    </details>
  );
}
