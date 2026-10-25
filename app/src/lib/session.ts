// 起動時のログイン確認（#128）。
// 認証拒否（401/403）と、通信失敗・サーバー障害（5xx など）を分ける。
// 一時的な失敗で保存済みトークンを捨てない（捨てると再ログインが必要になる）。

/** 起動時の /me の失敗が「トークンが無効」か。ApiError の status だけを見る（通信失敗は status を持たない） */
export function isAuthRejection(e: unknown): boolean {
  const status = typeof e === 'object' && e !== null ? (e as { status?: unknown }).status : undefined;
  return status === 401 || status === 403;
}

export interface SessionRestore<T> {
  me: T | null;
  /** 通信できなかった。トークンは残してあるので、再試行できる */
  failed: boolean;
}

/**
 * 保存済みトークンで /me を確かめる。
 * 認証拒否のときだけトークンを捨てる。通信失敗・5xx のときはトークンを残す。
 */
export async function restoreSession<T>(opts: {
  token: string | null;
  fetchMe: () => Promise<T>;
  clearToken: () => Promise<void>;
}): Promise<SessionRestore<T>> {
  if (!opts.token) return { me: null, failed: false };
  try {
    return { me: await opts.fetchMe(), failed: false };
  } catch (e) {
    if (isAuthRejection(e)) {
      await opts.clearToken();
      return { me: null, failed: false };
    }
    return { me: null, failed: true };
  }
}
