// プロフィール入力と画像の上限を、送信前に検証する。
export function validateImageAsset(asset: { width: number; height: number }) {
  // 読めない画像はwidth・heightが0で返ることがある。切り取りの計算へ渡さない。
  if (!Number.isFinite(asset.width) || !Number.isFinite(asset.height) || asset.width <= 0 || asset.height <= 0) {
    throw new Error('画像を読み込めませんでした。別の画像を選んでください');
  }
}
export function profilePatch(me: { name: string; avatar: string | null }, name: string, avatar: string | null) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('名前を入力してください');
  if (trimmed.length > 20) throw new Error('名前は20文字以内で入力してください');
  const patch: { name?: string; avatar?: string | null } = {};
  if (trimmed !== me.name) patch.name = trimmed;
  if (avatar !== me.avatar) patch.avatar = avatar;
  return patch;
}

export function jpegDataUrl(base64?: string | null) {
  if (!base64) throw new Error('画像を読み込めませんでした。別の画像を選んでください');
  const url = `data:image/jpeg;base64,${base64}`;
  // ASCIIのdata URL全体で制限する（デコード後の画像より厳しい上限）。
  if (url.length > 200 * 1024) throw new Error('画像が200KBを超えています。別の画像を選んでください');
  return url;
}
