import { midiToFreq } from "./music";

let ctx = null;

export function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Bowed-string approximation: sawtooth through a lowpass, slow attack, light vibrato.
export function playNote(midi, duration = 1.4) {
  const ac = getContext();
  const t = ac.currentTime;
  const freq = midiToFreq(midi);

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;

  const vibrato = ac.createOscillator();
  const vibratoGain = ac.createGain();
  vibrato.frequency.value = 5.2;
  vibratoGain.gain.setValueAtTime(0, t);
  vibratoGain.gain.linearRampToValueAtTime(freq * 0.004, t + 0.5);
  vibrato.connect(vibratoGain).connect(osc.frequency);

  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(freq * 5, 4200);
  filter.Q.value = 0.8;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.28, t + 0.08);
  gain.gain.setValueAtTime(0.28, t + duration - 0.15);
  gain.gain.linearRampToValueAtTime(0, t + duration);

  osc.connect(filter).connect(gain).connect(ac.destination);
  osc.start(t);
  vibrato.start(t);
  osc.stop(t + duration);
  vibrato.stop(t + duration);
}
