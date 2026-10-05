/** Tiny synthesized sound kit (no audio files). */
import { local } from '../net/storage.ts';

export type Sfx = 'card' | 'camel' | 'swap' | 'coin' | 'turn' | 'seal' | 'error' | 'join';

let ctx: AudioContext | null = null;
let muted = local.get('jaipur.muted') === '1';

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  local.set('jaipur.muted', m ? '1' : '0');
}

function tone(freq: number, at: number, dur: number, type: OscillatorType, gain: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + at);
  g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + at);
  osc.stop(ctx.currentTime + at + dur + 0.05);
}

function noise(at: number, dur: number, gain: number) {
  if (!ctx) return;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2400;
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(ctx.currentTime + at);
}

export function play(sfx: Sfx) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { return; }
  switch (sfx) {
    case 'card': noise(0, 0.09, 0.25); break;
    case 'swap': noise(0, 0.08, 0.2); noise(0.09, 0.08, 0.2); break;
    case 'camel': tone(196, 0, 0.18, 'triangle', 0.12); tone(147, 0.12, 0.22, 'triangle', 0.1); break;
    case 'coin': [1318, 1760, 2093].forEach((f, i) => tone(f, i * 0.07, 0.25, 'sine', 0.08)); break;
    case 'turn': tone(660, 0, 0.3, 'sine', 0.06); tone(990, 0.08, 0.35, 'sine', 0.05); break;
    case 'seal': [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.11, 0.5, 'triangle', 0.09)); break;
    case 'join': tone(523, 0, 0.2, 'sine', 0.07); tone(784, 0.1, 0.3, 'sine', 0.07); break;
    case 'error': tone(180, 0, 0.14, 'square', 0.04); break;
  }
}
