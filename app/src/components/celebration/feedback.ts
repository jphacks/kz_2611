// #93 参加の効果音（Web Audio）と振動。ない環境では何もしない（エラーにしない）
import { Platform } from 'react-native';

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

/** 音を鳴らせる環境だけ AudioContext を返す */
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

/**
 * スワイプで参加した直後（ユーザーの操作の中）に呼ぶ。
 * Safari は操作の中で AudioContext を作らないと後から鳴らせないため、先に用意しておく。
 */
export function prepareCelebrationSound(enabled: boolean) {
  if (enabled) audio();
}

/** ヒットストップの短い「コッ」という音 */
export function playHitSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = audio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    [85, 140, 330].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(frequency, t);
      osc.frequency.exponentialRampToValueAtTime(frequency * 2, t + 0.25);
      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26 + i * 0.01);
    });
  } catch {
    // 音が出なくても演出は続ける
  }
}

/** 鳥が飛び立つときのファンファーレ */
export function playCelebrationSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = audio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    // 紙吹雪のノイズ
    [0, 0.12, 0.28, 0.44, 0.6].forEach((delay, i) => {
      const source = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.18), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      const gain = ctx.createGain();
      for (let k = 0; k < data.length; k++) data[k] = (Math.random() * 2 - 1) * Math.exp(-k / (data.length * 0.2));
      source.buffer = buffer;
      gain.gain.value = i === 0 ? 0.32 : 0.1;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(t + delay);
    });
    // 低音の支え
    [55, 220, 330, 440, 554, 659].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.045, t + (i ? 1.05 : 0.01));
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 2.6);
    });
    // きらめき
    [0, 4, 7, 12, 16, 19, 24, 16, 19, 24, 28, 31].forEach((note, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440 * Math.pow(2, note / 12);
      gain.gain.setValueAtTime(0.07, t + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.065 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.065);
      osc.stop(t + i * 0.065 + 0.31);
    });
  } catch {
    // 音が出なくても演出は続ける
  }
}

/** 振動。navigator.vibrate がない端末（iPhone など）では何もしない */
export function vibratePattern(pattern: number | number[], enabled = true) {
  if (!enabled && pattern !== 0) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // 振動できなくても演出は続ける
  }
}
