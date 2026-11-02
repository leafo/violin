const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export const STRINGS = [
  { name: "G", midi: 55, step: 25 },
  { name: "D", midi: 62, step: 29 },
  { name: "A", midi: 69, step: 33 },
  { name: "E", midi: 76, step: 37 },
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

export const POSITIONS = [
  { id: 1, label: "1st" },
  { id: 2, label: "2nd" },
  { id: 3, label: "3rd" },
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

// Positions are diatonic: each finger owns a letter name, so a note's finger
// comes from its letter distance to the open string, not its semitone distance.
// E♭ on the A string is a low 4, not a high 3.
function stoppedFinger(note, string, position) {
  if (note.midi <= string.midi) return null;
  const finger = note.step - string.step - (position.id - 1);
  if (finger >= 1 && finger <= 4) return finger;
  // A raised open-string letter, such as G♯ on the G string.
  if (finger === 0 && position.id === 1) return 1;
  return null;
}

// Keyed by finger, then semitones above the open string. Only 1st position has
// a settled low/high vocabulary, so other positions show the bare finger.
const PLACEMENTS = {
  1: { 1: "low" },
  2: { 3: "low", 4: "high" },
  3: { 6: "high" },
  4: { 6: "low", 8: "high" },
};

function fingering(note, position, allowedStrings) {
  const candidates = allowedStrings.map((i) => {
    const string = STRINGS[i];
    const offset = note.midi - string.midi;
    if (offset === 0) return position.id === 1 ? { string: i, offset, finger: 0 } : null;
    const finger = stoppedFinger(note, string, position);
    if (finger === null) return null;
    const placement = position.id === 1 ? PLACEMENTS[finger]?.[offset] ?? null : null;
    return { string: i, offset, finger, placement };
  });
  return candidates.filter(Boolean).sort((a, b) => a.finger - b.finger)[0] ?? null;
}

export function fingerText(note) {
  if (note.finger === 0) return "open";
  return note.placement ? `${note.placement} ${note.finger}` : String(note.finger);
}

// Every diatonic note of the key that can be played in the position on the
// chosen strings, ordered low to high.
export function notePool(key, position, allowedStrings) {
  const scale = keyScale(key);
  const pool = [];
  for (let midi = STRINGS[0].midi; midi <= STRINGS[3].midi + 12; midi++) {
    const note = spell(midi, scale);
    if (!note) continue;
    const fing = fingering(note, position, allowedStrings);
    if (!fing) continue;
    pool.push({ ...note, ...fing });
  }
  return pool;
}

export function noteName(note) {
  return `${note.letter}${accSymbol(note.acc)}`;
}

export function tonicPc(key) {
  return (NATURAL_PC[LETTERS.indexOf(key.tonic)] + key.acc + 12) % 12;
}
