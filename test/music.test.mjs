import test from "node:test";
import assert from "node:assert/strict";
import { KEYS, POSITIONS, STRINGS, fingerText, noteName, notePool } from "../src/music.js";

const ALL = [0, 1, 2, 3];
const key = (id) => KEYS.find((k) => k.id === id);
const pos = (id) => POSITIONS.find((p) => p.id === id);

function table(keyId, positionId) {
  const out = {};
  for (const n of notePool(key(keyId), pos(positionId), ALL)) {
    out[`${noteName(n)}${n.octave}`] = `${STRINGS[n.string].name} ${fingerText(n)}`;
  }
  return out;
}

test("G major in 1st position", () => {
  assert.deepEqual(table("G", 1), {
    G3: "G open", A3: "G 1", B3: "G high 2", C4: "G 3",
    D4: "D open", E4: "D 1", "F♯4": "D high 2", G4: "D 3",
    A4: "A open", B4: "A 1", C5: "A low 2", D5: "A 3",
    E5: "E open", "F♯5": "E 1", G5: "E low 2", A5: "E 3", B5: "E 4",
  });
});

test("B♭ major in 1st position uses low 4 and low 1", () => {
  const t = table("Bb", 1);
  assert.equal(t["B♭3"], "G low 2");
  assert.equal(t["E♭4"], "D low 1");
  assert.equal(t["B♭4"], "A low 1");
  assert.equal(t["E♭5"], "A low 4");
  assert.equal(t["F5"], "E low 1");
  assert.equal(t["B♭5"], "E low 4");
});

test("A major keeps G♯ on the G string as a low 1", () => {
  assert.equal(table("A", 1)["G♯3"], "G low 1");
});

test("E major has a high 3 on the A string", () => {
  assert.equal(table("E", 1)["D♯5"], "A high 3");
});

test("3rd position on the E string is A B C D", () => {
  const t = table("G", 3);
  assert.equal(t.A5, "E 1");
  assert.equal(t.B5, "E 2");
  assert.equal(t.C6, "E 3");
  assert.equal(t.D6, "E 4");
});

test("2nd and 3rd position never use open strings", () => {
  for (const k of KEYS) {
    for (const p of [pos(2), pos(3)]) {
      assert.ok(notePool(k, p, ALL).every((n) => n.finger !== 0), `${k.id} ${p.label}`);
    }
  }
});

test("each finger keeps one letter per string, in every key and position", () => {
  for (const k of KEYS) {
    for (const p of POSITIONS) {
      const seen = {};
      for (const n of notePool(k, p, ALL)) {
        if (n.finger === 0) continue;
        const slot = `${n.string}:${n.finger}`;
        const raisedOpen = p.id === 1 && n.step === STRINGS[n.string].step;
        if (raisedOpen) continue;
        assert.equal(seen[slot] ?? n.letter, n.letter, `${k.id} ${p.label} ${slot}`);
        seen[slot] = n.letter;
      }
    }
  }
});

test("removing a string falls back to the 4th finger", () => {
  const pool = notePool(key("G"), pos(1), [0, 1, 2]);
  const e5 = pool.find((n) => n.midi === 76);
  assert.equal(STRINGS[e5.string].name, "A");
  assert.equal(e5.finger, 4);
});
