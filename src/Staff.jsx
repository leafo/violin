import { keySignature } from "./music";
import styles from "./Staff.module.css";

const HALF = 8;
const PAD = 8;
const TOP_STEP = 16;
const BOTTOM_STEP = -8;
const WIDTH = 360;
const HEIGHT = PAD * 2 + (TOP_STEP - BOTTOM_STEP) * HALF;

// Staff step 0 is the bottom line (E4); each step is a line or space.
const y = (step) => PAD + (TOP_STEP - step) * HALF;

const SHARP_STEPS = { F: 8, C: 5, G: 9, D: 6, A: 3, E: 7, B: 4 };
const FLAT_STEPS = { B: 4, E: 7, A: 3, D: 6, G: 2, C: 5, F: 1 };

export default function Staff({ note, keyDef, matched }) {
  const sig = keySignature(keyDef);
  const accidentals = sig.sharps.length
    ? sig.sharps.map((l) => ({ sym: "♯", step: SHARP_STEPS[l] }))
    : sig.flats.map((l) => ({ sym: "♭", step: FLAT_STEPS[l] }));

  const noteX = 120 + accidentals.length * 16 + 90;
  const step = note.step - 30;
  const stemDown = step >= 4;

  const ledgers = [];
  for (let s = -2; s >= step && s >= BOTTOM_STEP; s -= 2) ledgers.push(s);
  for (let s = 10; s <= step && s <= TOP_STEP; s += 2) ledgers.push(s);

  return (
    <svg
      className={styles.staff}
      viewBox={`0 0 ${WIDTH + accidentals.length * 16} ${HEIGHT}`}
      role="img"
      aria-label="Note on the treble staff"
    >
      {[0, 2, 4, 6, 8].map((s) => (
        <line key={s} className={styles.line} x1="4" x2={WIDTH + accidentals.length * 16 - 4} y1={y(s)} y2={y(s)} />
      ))}
      <text className={styles.clef} x="12" y={y(2) + 4}>
        𝄞
      </text>
      {accidentals.map((a, i) => (
        <text key={i} className={styles.accidental} x={86 + i * 16} y={y(a.step) + 8}>
          {a.sym}
        </text>
      ))}
      {ledgers.map((s) => (
        <line key={s} className={styles.ledger} x1={noteX - 16} x2={noteX + 16} y1={y(s)} y2={y(s)} />
      ))}
      <g className={matched ? styles.matched : styles.note}>
        <ellipse cx={noteX} cy={y(step)} rx="10" ry="7" transform={`rotate(-20 ${noteX} ${y(step)})`} />
        <line
          className={styles.stem}
          x1={stemDown ? noteX - 9 : noteX + 9}
          x2={stemDown ? noteX - 9 : noteX + 9}
          y1={y(step)}
          y2={y(step) + (stemDown ? 1 : -1) * 7 * HALF}
        />
      </g>
    </svg>
  );
}
