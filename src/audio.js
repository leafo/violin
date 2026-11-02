import { midiToFreq } from "./music";

let ctx = null;

export function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Bowed-string approximation: sawtooth through a lowpass, slow attack, light vibrato.
export function playNote(midi, duration = 1.4, delay = 0) {
  const ac = getContext();
  const t = ac.currentTime + delay;
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

export function click(delay = 0, accent = false) {
  const ac = getContext();
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.frequency.value = accent ? 1500 : 1000;
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.07);
}
