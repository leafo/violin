import { STRINGS } from "./music";
import styles from "./Fingerboard.module.css";

const NUT_Y = 46;
const LENGTH = 560;
const BOARD_H = 340;
const STRING_X = [58, 96, 134, 172];

const yFor = (offset) => NUT_Y + LENGTH * (1 - Math.pow(2, -offset / 12));

export default function Fingerboard({ note, pool, show }) {
  return (
    <svg className={styles.board} viewBox={`0 0 230 ${BOARD_H}`} role="img" aria-label="Fingerboard">
      <polygon className={styles.wood} points={`40,${NUT_Y} 190,${NUT_Y} 204,${BOARD_H} 26,${BOARD_H}`} />
      <rect className={styles.nut} x="38" y={NUT_Y - 5} width="154" height="5" rx="2" />
      {STRINGS.map((s, i) => (
        <g key={s.name}>
          <line
            className={styles.string}
            x1={STRING_X[i]}
            x2={STRING_X[i] - (i - 1.5) * 1.5}
            y1={NUT_Y - 5}
            y2={BOARD_H}
            style={{ strokeWidth: 3 - i * 0.5 }}
          />
          <text className={styles.stringName} x={STRING_X[i]} y="14" textAnchor="middle">
            {s.name}
          </text>
        </g>
      ))}
      {pool.map((n) => (
        <circle
          key={n.midi}
          className={n.offset === 0 ? styles.ghostOpen : styles.ghost}
          cx={STRING_X[n.string]}
          cy={n.offset === 0 ? NUT_Y - 15 : yFor(n.offset)}
          r={n.offset === 0 ? 4 : 5}
        />
      ))}
      {show && (
        <g className={styles.current}>
          <circle
            cx={STRING_X[note.string]}
            cy={note.offset === 0 ? NUT_Y - 15 : yFor(note.offset)}
            r={note.offset === 0 ? 8 : 12}
            className={note.offset === 0 ? styles.open : styles.finger}
          />
          <text
            x={STRING_X[note.string]}
            y={(note.offset === 0 ? NUT_Y - 15 : yFor(note.offset)) + 5}
            textAnchor="middle"
          >
            {note.finger}
          </text>
        </g>
      )}
    </svg>
  );
}
