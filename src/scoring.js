export const TOLERANCE_CENTS = 40;

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const total = (samples) => samples.reduce((sum, s) => sum + s.dt, 0);

// samples: { t: seconds after the note's start, midi: detected pitch or null, dt }
export function gradeNote(samples, target, noteSeconds) {
  const voiced = samples.filter((s) => s.midi !== null);
  // A few voiced frames is a metronome click or bow noise, not a played note.
  if (total(voiced) < 0.05) return "silent";

  const inTune = voiced.filter((s) => Math.abs(s.midi - target) * 100 <= TOLERANCE_CENTS);
  if (total(inTune) >= Math.min(0.2, noteSeconds * 0.35)) {
    return inTune[0].t <= Math.min(0.18, noteSeconds * 0.4) ? "hit" : "late";
  }

  const diff = median(voiced.map((s) => s.midi)) - target;
  if (Math.abs(diff) * 100 <= TOLERANCE_CENTS) return "short";
  if (Math.abs(diff) <= 1) return diff > 0 ? "sharp" : "flat";
  return "wrong";
}

export function summarize(results) {
  const counts = {};
  for (const r of results) counts[r] = (counts[r] || 0) + 1;
  const parts = ["late", "short", "flat", "sharp", "wrong", "silent"]
    .filter((r) => counts[r])
    .map((r) => `${counts[r]} ${r === "silent" ? "not heard" : r === "wrong" ? "wrong note" : r}`);
  const clean = `${counts.hit || 0} of ${results.length} clean`;
  return parts.length ? `${clean}. ${parts.join(", ")}.` : `${clean}.`;
}
