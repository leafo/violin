import test from "node:test";
import assert from "node:assert/strict";
import { KEYS, POSITIONS, notePool, tonicPc } from "../src/music.js";
import { generatePhrase } from "../src/phrase.js";

const STRING_SETS = [[0, 1, 2, 3], [2, 3], [0], [3]];

function forEachPhrase(fn) {
  for (const key of KEYS) {
    for (const position of POSITIONS) {
      for (const strings of STRING_SETS) {
        const pool = notePool(key, position, strings);
        for (const bars of [1, 2, 4]) {
          for (const style of ["quarters", "mixed"]) {
            for (let i = 0; i < 40; i++) fn(generatePhrase(pool, key, bars, style), { pool, key, bars });
          }
        }
      }
    }
  }
}

test("every bar adds up to four beats", () => {
  forEachPhrase((notes, { bars }) => {
    for (let b = 0; b < bars; b++) {
      const beats = notes.filter((n) => n.bar === b).reduce((sum, n) => sum + n.dur, 0);
      assert.equal(beats, 4);
    }
  });
});

test("adjacent notes never repeat a pitch", () => {
  forEachPhrase((notes, { pool }) => {
    if (pool.length < 2) return;
    for (let i = 1; i < notes.length; i++) assert.notEqual(notes[i].midi, notes[i - 1].midi);
  });
});

test("phrases start and end on the tonic when the pool has one", () => {
  forEachPhrase((notes, { pool, key }) => {
    const tonic = tonicPc(key);
    const tonics = pool.filter((n) => n.midi % 12 === tonic).length;
    if (tonics === 0) return;
    assert.equal(notes[notes.length - 1].midi % 12, tonic);
    // Two notes and one tonic cannot both start and end on it without repeating.
    if (notes.length > 2 || tonics > 1) assert.equal(notes[0].midi % 12, tonic);
  });
});

test("every note comes from the pool", () => {
  forEachPhrase((notes, { pool }) => {
    for (const n of notes) assert.ok(pool.some((p) => p.midi === n.midi));
  });
});
