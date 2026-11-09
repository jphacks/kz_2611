// 参加をやめたときのホラー演出の時間割（ミリ秒）と、時間から動きを決める純粋関数
export const LEAVE_TIMING = {
  /** 暗転したまま無音で待つ */
  slit: 1800,
  /** すき間のまま震えてから開き始める */
  open0: 2500,
  open1: 3700,
  /** 指の位置をにらむ */
  look: 3800,
  /** 真正面を見つめる */
  stare: 4600,
  /** ささやきと血文字 */
  whisper: 5100,
  /** ブツッと切れる */
  cut: 7900,
  end: 8400,
} as const;

export const LEAVE_TEXT = 'なんでやめたの';

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const between = (ms: number, a: number, b: number) => clamp01((ms - a) / (b - a));

/** まぶたの開き具合（0=閉じる、1=開く、1より大きい=見開く） */
export function lidOpen(ms: number): number {
  const s = LEAVE_TIMING;
  if (ms < s.slit) return 0;
  if (ms < s.slit + 350) return 0.035 * easeOut(between(ms, s.slit, s.slit + 350));
  if (ms < s.open0) return 0.035 + Math.sin(ms / 45) * 0.006;
  if (ms < s.stare) return 0.035 + 0.965 * easeOut(between(ms, s.open0, s.open1));
  return 1 + 0.13 * easeOut(between(ms, s.stare, s.stare + 300));
}

/** 血のしずくの進み方（流れる→少し止まる→また流れる）。0〜1 */
export function dripProgress(u: number, pause: number): number {
  const p1 = 0.28;
  const p2 = 0.45 + 0.25 * pause;
  if (u < p1) return 0.4 * easeOut(u / p1);
  if (u < p2) return 0.4 + 0.04 * ((u - p1) / (p2 - p1));
  return 0.44 + 0.56 * easeOut((u - p2) / (1 - p2));
}
