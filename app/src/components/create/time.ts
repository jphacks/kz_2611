export type TimePreset = '今すぐ' | '30分後' | '1時間後';

// 候補を選んだ場合だけ、保存時点の端末ローカル時刻へ固定する。
export function resolveTimeText(text: string, preset: TimePreset | null, now: Date): string {
  if (!preset) return text;
  const minutes = preset === '30分後' ? 30 : preset === '1時間後' ? 60 : 0;
  const target = new Date(now.getTime() + minutes * 60_000);
  const tomorrow = target.getFullYear() !== now.getFullYear() || target.getMonth() !== now.getMonth() || target.getDate() !== now.getDate();
  const hh = String(target.getHours()).padStart(2, '0');
  const mm = String(target.getMinutes()).padStart(2, '0');
  return `${tomorrow ? '明日 ' : ''}${hh}:${mm}〜`;
}
