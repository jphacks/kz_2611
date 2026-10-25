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

/**
 * 参加確定の release ハンドラーから、await / タイマーより前に呼ぶ。
 * 短いパターンを1回だけ送り、後続呼び出しで上書きしない。
 * iPhone の switch は iOS 18 以降の実験的な方法で、鳴動は保証できない。
 * WebKit 313638@main は label.click() による鳴動を制限しており、新しい Safari では効かない場合がある。
 * 戻り値は API 失敗・画面離脱時の停止用（オフ／非対応なら何もしない）。
 */
export function startJoinHaptic(enabled: boolean): () => void {
  const noop = () => {};
  if (!enabled || Platform.OS !== 'web' || typeof navigator === 'undefined') return noop;
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate([30, 20, 35, 20, 40, 25, 60]);
      let stopped = false;
      return () => {
        if (stopped) return;
        stopped = true;
        vibratePattern(0);
      };
    }
    const ua = navigator.userAgent;
    const ios = Number(/OS (\d+)/.exec(ua)?.[1] ?? 0);
    if (!/iPhone/.test(ua) || ios < 18 || typeof document === 'undefined' || !document.body) return noop;
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.setAttribute('aria-hidden', 'true');
    Object.assign(label.style, { position: 'fixed', left: '0', bottom: '0', width: '1px', height: '1px', opacity: '0.001', pointerEvents: 'none' });
    label.appendChild(input);
    document.body.appendChild(label);
    try { label.click(); } finally { label.remove(); }
    // 遅延 click はユーザー操作外になるため予約しない。
  } catch {
    // 非対応・権限拒否でも参加処理を続ける。
  }
  return noop;
}

/** Vibration API のみ。オフなら停止要求も送らない。 */
export function vibratePattern(pattern: number | number[], enabled = true) {
  if (!enabled || Platform.OS !== 'web') return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // 振動できなくても演出は続ける
  }
}
