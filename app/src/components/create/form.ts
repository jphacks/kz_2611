// 募集フォームの入力チェック（最終的な判定はAPIが行う）
export interface Draft {
  title: string; place: string; time_text: string;
  capacity: number; duration_min: number; group_id: number | null;
}
export function validateDraft(draft: Draft): string {
  if (!draft.title.trim() || draft.title.trim().length > 20) return 'やることを1〜20文字で入力してください';
  if (draft.place.trim().length > 30) return '場所は30文字以内で入力してください';
  if (draft.time_text.trim().length > 20) return '時間は20文字以内で入力してください';
  if (!Number.isInteger(draft.capacity) || draft.capacity < 2 || draft.capacity > 20) return '人数は主催者を含む2〜20人で選んでください';
  if (![15, 30, 60, 120].includes(draft.duration_min)) return '表示時間を選んでください';
  return '';
}
