export type WheelTime = { hour: number; minute: number };

// 端末ローカル時刻を5分単位に切り上げる。日付は呼び出し元を変更しない。
export function roundUpTime(now: Date): WheelTime {
  const target = new Date(now.getTime());
  target.setMinutes(Math.ceil((now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60_000) / 5) * 5, 0, 0);
  return { hour: target.getHours(), minute: target.getMinutes() };
}

// 編集では旧形式の分もそのまま復元する（ホイールで変更すると5分刻み）。
export function parseTimeText(text: string, now: Date): WheelTime {
  const match = /^(?:明日 )?(\d{2}):(\d{2})〜$/.exec(text);
  if (match && Number(match[1]) < 24 && Number(match[2]) < 60) {
    return { hour: Number(match[1]), minute: Number(match[2]) };
  }
  return roundUpTime(now);
}

// 秒は比較しない。同じ表示分を選んだだけで翌日にならないようにする。
export function formatWheelTime(time: WheelTime, now: Date): string {
  const tomorrow = time.hour * 60 + time.minute < now.getHours() * 60 + now.getMinutes();
  return `${tomorrow ? '明日 ' : ''}${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}〜`;
}
