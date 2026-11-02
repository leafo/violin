import { keySignature } from "./music.js";
import styles from "./Staff.module.css";

const HALF = 8;
const PAD = 8;
const TOP_STEP = 16;
const BOTTOM_STEP = -8;
const STEM = 7 * HALF;
const MARK_H = 22;
const LABEL_H = 58;
const BASE_HEIGHT = PAD * 2 + (TOP_STEP - BOTTOM_STEP) * HALF;
const ADVANCE = { 0.5: 44, 1: 54, 2: 80, 4: 130 };
const BAR_GAP = 18;

// Staff step 0 is the bottom line (E4); each step is a line or space.
const y = (step) => PAD + (TOP_STEP - step) * HALF;
const staffStep = (note) => note.step - 30;

const SHARP_STEPS = { F: 8, C: 5, G: 9, D: 6, A: 3, E: 7, B: 4 };
const FLAT_STEPS = { B: 4, E: 7, A: 3, D: 6, G: 2, C: 5, F: 1 };

function beamPairs(notes) {
  const pairs = {};
  for (let i = 0; i < notes.length - 1; i++) {
    if (notes[i].dur === 0.5 && notes[i + 1].dur === 0.5 && notes[i].bar === notes[i + 1].bar) {
      const stepA = staffStep(notes[i]);
      const stepB = staffStep(notes[i + 1]);
      const down = (stepA + stepB) / 2 >= 4;
      const tip = down ? y(Math.min(stepA, stepB)) + STEM : y(Math.max(stepA, stepB)) - STEM;
      pairs[i] = pairs[i + 1] = { first: i, down, tip };
      i++;
    }
  }
  return pairs;
}

export default function Staff({
  notes,
  keyDef,
  statuses = [],
  marks,
  labels,
  phrase = false,
  timeSignature = false,
  finalBar = false,
  lineWidth = 0,
}) {
  const sig = keySignature(keyDef);
  const accidentals = sig.sharps.length
    ? sig.sharps.map((l) => ({ sym: "♯", step: SHARP_STEPS[l] }))
    : sig.flats.map((l) => ({ sym: "♭", step: FLAT_STEPS[l] }));
  const accW = accidentals.length * 16;
  const sigEnd = 92 + accW;
  const firstX = sigEnd + (timeSignature ? 44 : 0) + 30;

  let xs = [];
  let barLines = [];
  let x = firstX;
  notes.forEach((note, i) => {
    if (i > 0 && note.bar !== notes[i - 1].bar) {
      barLines.push(x - ADVANCE[notes[i - 1].dur] / 2 + BAR_GAP / 2);
      x += BAR_GAP;
    }
    xs.push(x);
    x += ADVANCE[note.dur ?? 1];
  });
  const lastAdvance = ADVANCE[notes[notes.length - 1].dur ?? 1];
  const tail = Math.max(44, lastAdvance * 0.75);
  const natural = x - lastAdvance + tail;
  const width = phrase ? Math.max(natural, lineWidth + accW) : 360 + accW;
  if (phrase) {
    // Every line shares one viewBox width so all lines render at the same scale.
    const stretch = (width - tail - firstX) / (natural - tail - firstX || 1);
    const place = (px) => firstX + (px - firstX) * stretch;
    xs = xs.map(place);
    barLines = barLines.map(place);
  } else {
    xs[0] = 210 + accW;
  }

  const height = BASE_HEIGHT + (marks ? MARK_H : 0) + (labels ? LABEL_H : 0);
  const pairs = beamPairs(notes);
  const labelTop = BASE_HEIGHT + (marks ? MARK_H : 0);

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
      {timeSignature && (
        <g className={styles.timeSignature}>
          <text x={sigEnd + 22} y={y(6) + 12} textAnchor="middle">4</text>
          <text x={sigEnd + 22} y={y(2) + 12} textAnchor="middle">4</text>
        </g>
      )}
      {barLines.map((bx) => (
        <line key={bx} className={styles.line} x1={bx} x2={bx} y1={y(8)} y2={y(0)} />
      ))}
      {phrase && !finalBar && (
        <line className={styles.line} x1={width - 4} x2={width - 4} y1={y(8)} y2={y(0)} />
      )}
      {finalBar && (
        <>
          <line className={styles.line} x1={width - 11} x2={width - 11} y1={y(8)} y2={y(0)} />
          <line className={styles.thick} x1={width - 5} x2={width - 5} y1={y(8)} y2={y(0)} />
        </>
      )}
      {notes.map((note, i) => {
        const step = staffStep(note);
        const dur = note.dur ?? 1;
        const nx = xs[i];
        const pair = pairs[i];
        const stemDown = pair ? pair.down : step >= 4;
        const stemX = stemDown ? nx - 9 : nx + 9;
        const tip = pair ? pair.tip : y(step) + (stemDown ? STEM : -STEM);
        const ledgers = [];
        for (let s = -2; s >= step && s >= BOTTOM_STEP; s -= 2) ledgers.push(s);
        for (let s = 10; s <= step && s <= TOP_STEP; s += 2) ledgers.push(s);
        return (
          <g key={i} className={styles[statuses[i] || "idle"]}>
            {ledgers.map((s) => (
              <line key={s} className={styles.ledger} x1={nx - 16} x2={nx + 16} y1={y(s)} y2={y(s)} />
            ))}
            <ellipse
              className={dur >= 2 ? styles.hollow : styles.head}
              cx={nx}
              cy={y(step)}
              rx="10"
              ry="7"
              transform={`rotate(-20 ${nx} ${y(step)})`}
            />
            {dur < 4 && <line className={styles.stem} x1={stemX} x2={stemX} y1={y(step)} y2={tip} />}
            {pair && pair.first === i && (
              <line
                className={styles.beam}
                x1={stemX - 1}
                x2={xs[i + 1] + (stemDown ? -9 : 9) + 1}
                y1={tip}
                y2={tip}
              />
            )}
            {marks?.[i] && (
              <text className={styles.mark} x={nx} y={BASE_HEIGHT + 8} textAnchor="middle">
                {marks[i]}
              </text>
            )}
            {labels?.[i] && (
              <text className={styles.label} textAnchor="middle">
                <tspan x={nx} y={labelTop + 10}>{labels[i].name}</tspan>
                <tspan x={nx} y={labelTop + 28} className={styles.where}>{labels[i].string}</tspan>
                <tspan x={nx} y={labelTop + 46} className={styles.where}>{labels[i].finger}</tspan>
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
