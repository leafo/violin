import { getContext } from "./audio.js";

const MIN_FREQ = 180;
const MAX_FREQ = 1500;

// YIN difference-function pitch estimate. Returns Hz or null when unvoiced.
export function detectPitch(buf, sampleRate) {
  const size = Math.floor(buf.length / 2);
  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.min(size - 1, Math.floor(sampleRate / MIN_FREQ));

  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / buf.length) < 0.01) return null;

  const d = new Float32Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < size; i++) {
      const diff = buf[i] - buf[i + lag];
      sum += diff * diff;
    }
    d[lag] = sum;
  }

  let running = 0;
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    running += d[lag];
    cmnd[lag] = running === 0 ? 1 : (d[lag] * lag) / running;
  }

  const threshold = 0.15;
  let found = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (cmnd[lag] < threshold) {
      while (lag + 1 <= maxLag && cmnd[lag + 1] < cmnd[lag]) lag++;
      found = lag;
      break;
    }
  }
  if (found < 0) return null;

  const a = cmnd[found - 1] ?? cmnd[found];
  const b = cmnd[found];
  const c = cmnd[found + 1] ?? cmnd[found];
  const denom = a - 2 * b + c;
  const shift = denom === 0 ? 0 : (a - c) / (2 * denom);
  return sampleRate / (found + shift);
}

export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

export async function startListening(onPitch) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ac = getContext();
  const source = ac.createMediaStreamSource(stream);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 4096;
  source.connect(analyser);

  const buf = new Float32Array(analyser.fftSize);
  let raf = 0;
  const tick = () => {
    analyser.getFloatTimeDomainData(buf);
    const freq = detectPitch(buf, ac.sampleRate);
    onPitch(freq ? freqToMidi(freq) : null);
    raf = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    cancelAnimationFrame(raf);
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
  };
}
