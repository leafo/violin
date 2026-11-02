import { keySignature } from "./music";
import styles from "./Staff.module.css";

const HALF = 8;
const PAD = 8;
const TOP_STEP = 16;
const BOTTOM_STEP = -8;
const SPACING = 54;
const LABEL_H = 36;
const BASE_HEIGHT = PAD * 2 + (TOP_STEP - BOTTOM_STEP) * HALF;

// Staff step 0 is the bottom line (E4); each step is a line or space.
const y = (step) => PAD + (TOP_STEP - step) * HALF;

const SHARP_STEPS = { F: 8, C: 5, G: 9, D: 6, A: 3, E: 7, B: 4 };
const FLAT_STEPS = { B: 4, E: 7, A: 3, D: 6, G: 2, C: 5, F: 1 };

export default function Staff({ notes, keyDef, statuses = [], labels }) {
  const sig = keySignature(keyDef);
  const accidentals = sig.sharps.length
    ? sig.sharps.map((l) => ({ sym: "♯", step: SHARP_STEPS[l] }))
    : sig.flats.map((l) => ({ sym: "♭", step: FLAT_STEPS[l] }));
  const accW = accidentals.length * 16;
  const single = notes.length === 1;

  const xAt = (i) =>
    single ? 210 + accW : 150 + accW + i * SPACING + Math.floor(i / 4) * 16;
  const width = single ? 360 + accW : xAt(notes.length - 1) + SPACING / 2 + 20;
  const height = BASE_HEIGHT + (labels ? LABEL_H : 0);

  return (
    <svg
      className={styles.staff}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Notes on the treble staff"
    >
      {[0, 2, 4, 6, 8].map((s) => (
        <line key={s} className={styles.line} x1="4" x2={width - 4} y1={y(s)} y2={y(s)} />
      ))}
      <text className={styles.clef} x="12" y={y(2) + 4}>
        𝄞
      </text>
      {accidentals.map((a, i) => (
        <text key={i} className={styles.accidental} x={86 + i * 16} y={y(a.step) + 8}>
          {a.sym}
        </text>
      ))}
      {!single &&
        notes.map(
          (_, i) =>
            i > 0 &&
            i % 4 === 0 && (
              <line
                key={`bar${i}`}
                className={styles.line}
                x1={xAt(i) - SPACING / 2 - 8}
                x2={xAt(i) - SPACING / 2 - 8}
                y1={y(8)}
                y2={y(0)}
              />
            )
        )}
      {!single && (
        <>
          <line className={styles.line} x1={width - 12} x2={width - 12} y1={y(8)} y2={y(0)} />
          <line className={styles.thick} x1={width - 6} x2={width - 6} y1={y(8)} y2={y(0)} />
        </>
      )}
      {notes.map((note, i) => {
        const step = note.step - 30;
        const x = xAt(i);
        const stemDown = step >= 4;
        const ledgers = [];
        for (let s = -2; s >= step && s >= BOTTOM_STEP; s -= 2) ledgers.push(s);
        for (let s = 10; s <= step && s <= TOP_STEP; s += 2) ledgers.push(s);
        return (
          <g key={i} className={styles[statuses[i] || "idle"]}>
            {ledgers.map((s) => (
              <line key={s} className={styles.ledger} x1={x - 16} x2={x + 16} y1={y(s)} y2={y(s)} />
            ))}
            <ellipse
              className={styles.head}
              cx={x}
              cy={y(step)}
              rx="10"
              ry="7"
              transform={`rotate(-20 ${x} ${y(step)})`}
            />
            <line
              className={styles.stem}
              x1={stemDown ? x - 9 : x + 9}
              x2={stemDown ? x - 9 : x + 9}
              y1={y(step)}
              y2={y(step) + (stemDown ? 1 : -1) * 7 * HALF}
            />
            {labels && labels[i] && (
              <text className={styles.label} x={x} textAnchor="middle">
                <tspan x={x} y={BASE_HEIGHT + 4}>
                  {labels[i].name}
                </tspan>
                <tspan x={x} y={BASE_HEIGHT + 22} className={styles.where}>
                  {labels[i].where}
                </tspan>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
