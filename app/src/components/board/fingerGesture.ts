// 掲示板カードの指先タッチ（X6）。カード幅の 1/4 を指の移動量とし、
// その半分を越えて離したら参加・取り消しを確定する。
export const FINGER_TRAVEL_RATIO = 0.25;
export const COMMIT_RATIO = 0.5;

export function fingerTravel(width: number) {
  return Math.max(0, width) * FINGER_TRAVEL_RATIO;
}

/** 触れた状態を 1、離れた状態を 0 としたときの、ドラッグ中の進み具合。 */
export function fingerProgress(from: 0 | 1, dx: number, width: number) {
  const travel = fingerTravel(width);
  if (!travel) return from;
  return Math.min(1, Math.max(0, from + dx / travel));
}

/** 指を半分以上動かしたか（離したときに確定するか）。 */
export function crossesCommit(dx: number, width: number) {
  const travel = fingerTravel(width);
  return travel > 0 && Math.abs(dx) > travel * COMMIT_RATIO;
}
