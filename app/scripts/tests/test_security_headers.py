"""#132 CSP・フレーム埋め込み制限: 配信中の静的ページと API の両方にヘッダーが付くこと"""
from pathlib import Path
import urllib.error
import urllib.request
from lib import BASE, expect

PAGE_CSP = [
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "script-src 'self'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
]
API_CSP = ["default-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", "object-src 'none'"]


def headers(path):
    req = urllib.request.Request(BASE + path, headers={'user-agent': 'kz2611-test'})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}


def check_common(label, h):
    expect(f'{label} X-Frame-Options', h.get('x-frame-options'), 'DENY')
    expect(f'{label} nosniff', h.get('x-content-type-options'), 'nosniff')


# ビルド出力（dist）に配信設定が含まれる
headers_file = Path(__file__).resolve().parents[2] / 'dist' / '_headers'
expect('dist/_headers がある', headers_file.is_file(), True)
text = headers_file.read_text(encoding='utf-8')
expect('dist/_headers に frame-ancestors', "frame-ancestors 'none'" in text, True)

# 静的ページ（トップ）
s, h = headers('/')
expect('トップページ', s, 200)
check_common('トップページ', h)
csp = h.get('content-security-policy', '')
expect('トップページの CSP がある', bool(csp), True)
for part in PAGE_CSP:
    expect(f'トップページ CSP: {part}', part in csp, True)
# #156 自前フォント配信に不要な外部 stylesheet/font の許可を戻さない
for origin in ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']:
    expect(f'トップページ CSP に不要な外部許可がない: {origin}', origin in csp, False)

# 静的ファイル（Service Worker / 画像も同じヘッダー）
s, h = headers('/sw.js')
expect('Service Worker', s, 200)
check_common('Service Worker', h)
expect('Service Worker の CSP がある', bool(h.get('content-security-policy')), True)

# API（正常系・認証エラーとも）
s, h = headers('/api/health')
expect('API health', s, 200)
check_common('API health', h)
csp = h.get('content-security-policy', '')
expect('API health の CSP がある', bool(csp), True)
for part in API_CSP:
    expect(f'API health CSP: {part}', part in csp, True)

s, h = headers('/api/me')
expect('API 認証エラー', s, 401)
check_common('API 認証エラー', h)
expect('API 認証エラーにも CSP', "frame-ancestors 'none'" in h.get('content-security-policy', ''), True)

# API の 404 も同じ
s, h = headers('/api/no-such-path')
expect('API 404', s, 404)
check_common('API 404', h)
expect('API 404 にも CSP', "frame-ancestors 'none'" in h.get('content-security-policy', ''), True)
