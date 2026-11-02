const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export const STRINGS = [
  { name: "G", midi: 55 },
  { name: "D", midi: 62 },
  { name: "A", midi: 69 },
  { name: "E", midi: 76 },
];

export const KEYS = [
  { id: "C", tonic: "C", acc: 0 },
  { id: "G", tonic: "G", acc: 0 },
  { id: "D", tonic: "D", acc: 0 },
  { id: "A", tonic: "A", acc: 0 },
  { id: "E", tonic: "E", acc: 0 },
  { id: "F", tonic: "F", acc: 0 },
  { id: "Bb", tonic: "B", acc: -1 },
  { id: "Eb", tonic: "E", acc: -1 },
];

// Hand "origin": the semitone offset above the open string where the first
// finger sits in its lowest placement.
export const POSITIONS = [
  { id: 1, label: "1st", origin: 1 },
  { id: 2, label: "2nd", origin: 3 },
  { id: 3, label: "3rd", origin: 5 },
];

export function accSymbol(acc) {
  return acc > 0 ? "♯" : acc < 0 ? "♭" : "";
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function keyScale(key) {
  const start = LETTERS.indexOf(key.tonic);
  const tonicPc = (NATURAL_PC[start] + key.acc + 12) % 12;
  const byPc = {};
  MAJOR.forEach((interval, degree) => {
    const letterIdx = (start + degree) % 7;
    const pc = (tonicPc + interval) % 12;
    let acc = pc - NATURAL_PC[letterIdx];
    if (acc > 6) acc -= 12;
    if (acc < -6) acc += 12;
    byPc[pc] = { letter: LETTERS[letterIdx], letterIdx, acc };
  });
  return byPc;
}

export function keySignature(key) {
  const scale = Object.values(keyScale(key));
  const sharps = ["F", "C", "G", "D", "A", "E", "B"].filter((l) =>
    scale.some((n) => n.letter === l && n.acc > 0)
  );
  const flats = ["B", "E", "A", "D", "G", "C", "F"].filter((l) =>
    scale.some((n) => n.letter === l && n.acc < 0)
  );
  return { sharps, flats };
}

export function spell(midi, scale) {
  const n = scale[midi % 12];
  if (!n) return null;
  const octave = Math.floor((midi - n.acc) / 12) - 1;
  return { ...n, octave, midi, step: octave * 7 + n.letterIdx };
}

// Finger spots relative to the hand origin: low/high slots for fingers 1-3,
// and a single spot for the 4th finger.
function fingerFor(offset, origin) {
  if (offset === 0) return 0;
  const rel = offset - origin;
  if (rel < 0 || rel > 6) return null;
  return Math.floor(rel / 2) + 1;
}

export function fingering(midi, position, allowedStrings) {
  let best = null;
  STRINGS.forEach((s, i) => {
    if (!allowedStrings.includes(i)) return;
    const offset = midi - s.midi;
    if (offset < 0) return;
    const finger = fingerFor(offset, position.origin);
    if (finger === null) return;
    if (!best || offset < best.offset) best = { string: i, offset, finger };
  });
  return best;
}

// Every diatonic note of the key that can be played in the position on the
// chosen strings, ordered low to high.
export function notePool(key, position, allowedStrings) {
  const scale = keyScale(key);
  const pool = [];
  for (let midi = STRINGS[0].midi; midi <= STRINGS[3].midi + 12; midi++) {
    const note = spell(midi, scale);
    if (!note) continue;
    const fing = fingering(midi, position, allowedStrings);
    if (!fing) continue;
    pool.push({ ...note, ...fing });
  }
  return pool;
}

export function noteName(note) {
  return `${note.letter}${accSymbol(note.acc)}`;
}
