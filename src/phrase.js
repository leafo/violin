import { tonicPc } from "./music.js";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const RHYTHMS = {
  quarters: { any: [[1, 1, 1, 1]], final: [[1, 1, 1, 1]] },
  mixed: {
    any: [
      [1, 1, 1, 1],
      [2, 1, 1],
      [1, 1, 2],
      [2, 2],
      [0.5, 0.5, 1, 1, 1],
      [1, 0.5, 0.5, 1, 1],
      [1, 1, 0.5, 0.5, 1],
    ],
    final: [
      [1, 1, 2],
      [2, 2],
      [4],
    ],
  },
};

function barRhythms(bars, style) {
  const { any, final } = RHYTHMS[style];
  const out = [];
  for (let b = 0; b < bars; b++) {
    if (b === bars - 1) out.push(pick(bars === 1 ? final.filter((r) => r.length > 1) : final));
    // Reusing the opening rhythm in bar 3 gives four-bar phrases a shape.
    else if (b === 2) out.push(out[0]);
    else out.push(pick(any));
  }
  return out;
}

function step(i, dir, size, length) {
  for (const j of [i + dir * size, i - dir * size, i + dir, i - dir]) {
    if (j >= 0 && j < length) return j;
  }
  return i;
}

// Adjacent notes always differ: the mic cannot hear a re-bow on the same pitch.
function walk(pool, tonics, count) {
  let i = tonics.length ? pick(tonics) : Math.floor(Math.random() * pool.length);
  let dir = i < pool.length / 2 ? 1 : -1;
  const out = [i];
  while (out.length < count - 1) {
    if (Math.random() < 0.3) dir = -dir;
    const next = step(i, dir, Math.random() < 0.75 ? 1 : 2, pool.length);
    dir = next === i ? dir : Math.sign(next - i);
    i = next;
    out.push(i);
  }
  if (count === 1) return out;

  const landings = tonics.filter((t) => t !== i);
  if (landings.length) {
    out.push(landings.reduce((best, t) => (Math.abs(t - i) < Math.abs(best - i) ? t : best)));
  } else if (tonics.length) {
    const before = out[out.length - 2];
    const replacement = [i + 1, i - 1, i + 2, i - 2].find(
      (j) => j >= 0 && j < pool.length && j !== before
    );
    if (replacement !== undefined) out[out.length - 1] = replacement;
    out.push(i);
  } else {
    out.push(step(i, -dir, 1, pool.length));
  }
  return out;
}

export function generatePhrase(pool, key, bars, style) {
  if (pool.length === 0) return [];
  const rhythms = barRhythms(bars, style);
  const count = rhythms.reduce((sum, r) => sum + r.length, 0);
  const tonics = pool.flatMap((n, i) => (n.midi % 12 === tonicPc(key) ? [i] : []));
  const path = walk(pool, tonics, count);

  const notes = [];
  rhythms.forEach((rhythm, bar) => {
    let beat = bar * 4;
    for (const dur of rhythm) {
      notes.push({ ...pool[path[notes.length]], dur, beat, bar });
      beat += dur;
    }
  });
  return notes;
}
