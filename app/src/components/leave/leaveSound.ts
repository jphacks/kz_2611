// 参加をやめたときのホラー演出の音（Web Audio と読み上げ）。ない環境では何もしない
import { Platform } from 'react-native';
import { LEAVE_TIMING } from './leaveTiming';

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext) as AudioContextCtor | undefined;
  if (typeof Ctor !== 'function') return null;
  try {
    context = context ?? new Ctor();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

/** スワイプを離した操作の中で呼ぶ（Safari は操作の中で作らないと鳴らせない） */
export function prepareLeaveSound(enabled: boolean) {
  if (enabled) audio();
}

interface Tone { type?: OscillatorType; f0: number; f1?: number; at?: number; dur: number; gain?: number; lowpass?: number }

function tone(ctx: AudioContext, { type = 'sine', f0, f1, at = 0, dur, gain = 0.5, lowpass }: Tone) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1 ?? f0, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc;
  if (lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    osc.connect(filter);
    node = filter;
  }
  node.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noiseBuffer(ctx: AudioContext, dur: number) {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function noise(ctx: AudioContext, at: number, dur: number, gain: number, bandpass: number) {
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = noiseBuffer(ctx, dur);
  filter.type = 'bandpass';
  filter.frequency.value = bandpass;
  filter.Q.value = 0.7;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(t);
}

/** まぶたが開くときの湿った音 */
function squelch(ctx: AudioContext, at: number, volume: number) {
  for (let i = 0; i < 5; i++) noise(ctx, at + i * 0.035 + Math.random() * 0.02, 0.05 + Math.random() * 0.05, 0.35 * volume, 500 + Math.random() * 900);
  tone(ctx, { f0: 220, f1: 90, at, dur: 0.18, gain: 0.15 * volume });
}

/** 左の耳から右の耳へ流れる息 */
function breath(ctx: AudioContext, at: number, dur: number) {
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = noiseBuffer(ctx, dur);
  filter.type = 'bandpass';
  filter.frequency.value = 2600;
  filter.Q.value = 1.2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out: AudioNode = g;
  if (typeof ctx.createStereoPanner === 'function') {
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(-1, t);
    pan.pan.linearRampToValueAtTime(1, t + dur);
    g.connect(pan);
    out = pan;
  }
  src.connect(filter);
  filter.connect(g);
  out.connect(ctx.destination);
  src.start(t);
}

function whisper(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.pitch = 0;
    u.rate = 0.7;
    u.volume = 0.9;
    const voice = window.speechSynthesis.getVoices().find(v => /ja/i.test(v.lang));
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // 読み上げできなくても演出は続ける
  }
}

/** 演出の始まりに呼ぶ。返した関数で途中のささやきを止める */
export function playLeaveSound(enabled: boolean, text: string): () => void {
  if (!enabled) return () => {};
  const ctx = audio();
  const s = LEAVE_TIMING;
  if (ctx) {
    try {
      squelch(ctx, s.slit / 1000, 0.5);
      squelch(ctx, s.open0 / 1000, 0.35);
      breath(ctx, (s.whisper - 400) / 1000, 2.9);
      tone(ctx, { f0: 110, f1: 26, at: s.cut / 1000, dur: 0.55, gain: 1 });
      noise(ctx, s.cut / 1000, 0.3, 0.7, 800);
    } catch {
      // 音が出なくても演出は続ける
    }
  }
  const timer = setTimeout(() => whisper(text), s.whisper);
  return () => {
    clearTimeout(timer);
    try { window.speechSynthesis?.cancel(); } catch { /* 止められなくてもよい */ }
  };
}
