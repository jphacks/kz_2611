// #98 演出中の FPS を見て、重い端末では粒の数を段階的に減らす。RN に依存しない純粋関数だけを置く

/** 100% から少しずつ減らす。最後まで残すのは 33% */
export const QUALITY_STEPS = [1, 0.8, 0.64, 0.51, 0.41, 0.33] as const;

/** これより平均が下がったら粒を減らす */
export const TARGET_FPS = 50;

/** 何フレームごとに平均を見るか */
export const SAMPLE_FRAMES = 30;

/** 合計時間（ms）とフレーム数から平均 FPS を出す */
export function averageFps(totalMs: number, frames: number) {
  if (!(frames > 0) || !(totalMs > 0)) return 60;
  return (frames * 1000) / totalMs;
}

/** 平均が 50fps を下回ったら次の段階へ。一度下げたら戻さない */
export function nextQuality(current: number, fps: number) {
  if (!Number.isFinite(fps) || fps >= TARGET_FPS) return current;
  return Math.min(QUALITY_STEPS.length - 1, Math.max(0, Math.floor(current) + 1));
}

/** 元の粒の数に quality をかける。0 にはしない */
export function particleCount(total: number, quality: number) {
  if (!(total > 0)) return 0;
  return Math.max(1, Math.round(total * quality));
}
