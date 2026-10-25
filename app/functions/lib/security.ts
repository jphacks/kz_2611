// #132 応答のセキュリティヘッダー。静的ファイルの CSP は public/_headers が付ける
export const COMMON_SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};

export const API_SECURITY_HEADERS: Record<string, string> = {
  // API は JSON だけを返す。フレーム埋め込みとスクリプト実行を全面禁止する
  'content-security-policy': "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'",
  ...COMMON_SECURITY_HEADERS,
};

/** 既に付いているヘッダー（_headers など）は上書きしない */
export function withSecurityHeaders(res: Response, headers: Record<string, string>): Response {
  const merged = new Headers(res.headers);
  for (const [name, value] of Object.entries(headers)) {
    if (!merged.has(name)) merged.set(name, value);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: merged });
}
