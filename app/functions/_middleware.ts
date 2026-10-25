// #132 API の応答にセキュリティヘッダーを付ける（静的ファイルの CSP は public/_headers）
import { API_SECURITY_HEADERS, COMMON_SECURITY_HEADERS, withSecurityHeaders } from './lib/security';

export const onRequest = async (context: { request: Request; next: () => Promise<Response> }) => {
  const { pathname } = new URL(context.request.url);
  const isApi = pathname === '/api' || pathname.startsWith('/api/');
  return withSecurityHeaders(await context.next(), isApi ? API_SECURITY_HEADERS : COMMON_SECURITY_HEADERS);
};
