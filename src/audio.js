import { midiToFreq } from "./music.js";

let ctx = null;

export function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Bowed-string approximation: sawtooth through a lowpass, slow attack, light vibrato.
export function playNote(midi, duration = 1.4, delay = 0, output = getContext().destination) {
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

  osc.connect(filter).connect(gain).connect(output);
  osc.start(t);
  vibrato.start(t);
  osc.stop(t + duration);
  vibrato.stop(t + duration);
}

export function click(delay = 0, accent = false, output = getContext().destination) {
  const ac = getContext();
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.frequency.value = accent ? 1500 : 1000;
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain).connect(output);
  osc.start(t);
  osc.stop(t + 0.07);
}

// Scheduled oscillators cannot be recalled as a group, so everything in a run
// goes through one gain node that can be silenced at once.
export function createBus() {
  const ac = getContext();
  const node = ac.createGain();
  node.connect(ac.destination);
  return {
    node,
    cancel() {
      node.gain.setTargetAtTime(0, ac.currentTime, 0.01);
      setTimeout(() => node.disconnect(), 100);
    },
  };
}

// Seconds between scheduling a sound and it leaving the speakers. Bluetooth
// headphones can add a few hundred milliseconds here.
export function outputDelay() {
  const ac = getContext();
  return (ac.outputLatency || 0) + (ac.baseLatency || 0);
}
