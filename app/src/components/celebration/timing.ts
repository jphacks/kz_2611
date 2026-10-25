// #93 / #98 参加が成立した瞬間の演出のタイミング。RN に依存しない純粋関数だけを置く

export const CELEBRATION = {
  burstMs: 2800,    // 触れた瞬間から大群・文字・閃光が終わるまで（ヒットストップは無し）
  birds: 240,       // 鳥の大群の数
  sparks: 156,      // 紙吹雪の数
  zoom: 1.08,       // 画面のズーム
  shake: 18,        // 画面の揺れの最大幅（px）
  letters: 340,     // 「とまった!!」の1文字目が出るまで（触れた瞬間から）
  letterStep: 60,   // 1文字ずつの間隔
} as const;

export interface CelebrationEffects {
  shake: boolean;
  flash: boolean;
  chromatic: boolean;
}

/** 「視差効果を減らす」がオンなら、揺れ・フラッシュ・色収差を止める */
export function celebrationEffects(reduced: boolean): CelebrationEffects {
  return { shake: !reduced, flash: !reduced, chromatic: !reduced };
}

/** 演出が自動で消えるまでの時間（約3秒）。ヒットストップを無くしたぶん前へ詰めた */
export function celebrationTotalMs() {
  return CELEBRATION.burstMs;
}

/** キーフレームを線形補間する（Canvas と CSS transform 用） */
export function sampleKeyframes(progress: number, input: readonly number[], output: readonly number[]) {
  if (!(progress > input[0])) return output[0];
  const last = input.length - 1;
  if (progress >= input[last]) return output[last];
  for (let i = 1; i <= last; i++) {
    if (progress <= input[i]) {
      const span = input[i] - input[i - 1] || 1;
      const ratio = (progress - input[i - 1]) / span;
      return output[i - 1] + (output[i] - output[i - 1]) * ratio;
    }
  }
  return output[last];
}

const SHAKE_INPUT = [0, 0.02, 0.04, 0.07, 0.1, 0.15, 0.17, 0.19, 0.23, 0.3, 0.32, 0.35, 1];
// 揺れの形（最大 1.0 に正規化）。左右に細かく振れて、最後は止まる
const SHAKE_STEPS = [0, -1, 0.89, -0.67, 0.44, 0, -0.5, 0.33, 0, -0.28, 0.17, 0, 0];

export function shakeInput() {
  return SHAKE_INPUT.slice();
}

/** 視差効果を減らすときは全部 0（揺れない） */
export function shakeOutput(reduced: boolean) {
  return SHAKE_STEPS.map(step => (reduced ? 0 : step * CELEBRATION.shake));
}

const ROTATE_INPUT = [0, 0.045, 0.06, 0.075, 0.09, 0.12, 0.16, 1];
const ROTATE_STEPS = [0, -2, 2, -1.5, 1, -0.5, 0, 0];

/** 画面の揺れ（px）。CSS transform 用 */
export function shakeAt(progress: number, reduced: boolean) {
  return sampleKeyframes(progress, SHAKE_INPUT, shakeOutput(reduced));
}

/** 画面の傾き（度）。CSS transform 用 */
export function rotateAt(progress: number, reduced: boolean) {
  const values = ROTATE_STEPS.map(step => (reduced ? 0 : step));
  return sampleKeyframes(progress, ROTATE_INPUT, values);
}

/** 画面のズーム。CSS transform 用 */
export function zoomAt(progress: number) {
  return sampleKeyframes(progress, [0, 0.04, 0.16, 1], [1, CELEBRATION.zoom, 1, 1]);
}

/**
 * 「とまった!!」の1文字ずつが飛び出すタイミング（演出の 0〜1 に対する割合）。
 * 返す値は昇順で、最後の文字も演出の終わりより前に出る。
 */
export function letterDelays(count: number) {
  return Array.from(
    { length: Math.max(0, count) },
    (_, i) => (CELEBRATION.letters + i * CELEBRATION.letterStep) / CELEBRATION.burstMs,
  );
}

/** 鳥の大群が飛び立つ中心。画面のほぼ中央 */
export function birdOrigin(width: number, height: number) {
  const w = Number.isFinite(width) && width > 0 ? width : 390;
  const h = Number.isFinite(height) && height > 0 ? height : 640;
  return { x: w / 2, y: h * 0.52 };
}
