// 招待URLの生成・読み取り（ブラウザーへのアクセスは画面側で分岐する）。
export const inviteLink = (code: string) => `https://kz2611.pages.dev/?invite=${encodeURIComponent(code)}`;
export function inviteFromUrl(url: string): string | null {
  try { return new URL(url).searchParams.get('invite') || null; } catch { return null; }
}
