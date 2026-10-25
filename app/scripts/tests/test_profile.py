"""#131 プロフィール画像: 画像の data URL だけを保存する。
PNG / JPEG / WebP の正常な画像は通り、SVG・画像でない値・MIME と実体の不一致・
復号後 200KB 超・巨大な縦横は 400 で拒否することを確かめる。"""
import base64, struct, zlib
from lib import call, expect, new_user


def request(method, path, token=None, body=None, status=200):
    s, r = call(method, path, body, token)
    expect(f'{method} {path} {body if body is None or len(str(body)) < 40 else "(長い本文)"}', s, status)
    return r


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)


def png_bytes(width=4, height=4, pad=0):
    """4x4 の PNG。pad はダミーの付加チャンクのデータ長（復号後のサイズを調整する）"""
    raw = b''.join(b'\x00' + bytes([255, 90, 54] * width) for _ in range(height))
    body = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    body += chunk(b'IDAT', zlib.compress(raw))
    if pad:
        body += chunk(b'prVt', b'\x00' * pad)
    return body + chunk(b'IEND', b'')


def png_claimed(width, height):
    """IHDR だけ指定した PNG（IDAT は中身を検証しないのでダミー）。巨大な縦横のテスト用"""
    body = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    return body + chunk(b'IDAT', zlib.compress(b'\x00' * 4)) + chunk(b'IEND', b'')


def data_url(mime, data):
    return f'data:{mime};base64,' + base64.b64encode(data).decode()


def png_of_size(total):
    """ちょうど total バイトになる PNG を作る"""
    pad = total - len(png_bytes()) - 12
    data = png_bytes(pad=pad)
    assert len(data) == total, (len(data), total)
    return data


# 手元で作った 4x4 の JPEG と WebP（依存ライブラリ無しでテストできるよう固定値にする）
JPEG = base64.b64decode(
    '/9j/4AAQSkZJRgABAQAASABIAAD/2wBDAAICAgICAgMCAgMFAwMDBQYFBQUFBggGBgYGBggKCAgICAgICgoKCgoKCgoMDAwMDAwO'
    'Dg4ODg8PDw8PDw8PDw//2wBDAQICAgQEBAcEBAcQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ'
    'EBAQEBAQEBAQEBD/wAARCAAEAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgED'
    'AwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RF'
    'RkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJ'
    'ytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgEC'
    'BAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNE'
    'RUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbH'
    'yMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDcooor+Rz/AFUP/9k='
)
WEBP = base64.b64decode(
    'UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoEAAQAAUAmJaACdLoB+AADsAD+pNf/OwbEu145//ewX3Gf7jP/p8AA'
)

token, me = new_user('prof')
other_token, other = new_user('prof2')

# ---- 認証 ----
request('PATCH', '/me', body={'avatar': None}, status=401)

# ---- 正常な PNG / JPEG / WebP ----
png = data_url('image/png', png_bytes())
updated = request('PATCH', '/me', token, {'avatar': png})['user']
expect('PNG を保存', updated['avatar'], png)
expect('保存した PNG を返す', request('GET', '/me', token)['user']['avatar'], png)
jpeg = data_url('image/jpeg', JPEG)
expect('JPEG を保存', request('PATCH', '/me', token, {'avatar': jpeg})['user']['avatar'], jpeg)
webp = data_url('image/webp', WEBP)
expect('WebP を保存', request('PATCH', '/me', token, {'avatar': webp})['user']['avatar'], webp)
expect('MIME の大文字も同じ形式として扱う',
       request('PATCH', '/me', token, {'avatar': png.replace('image/png', 'IMAGE/PNG')})['user']['avatar'],
       png.replace('image/png', 'IMAGE/PNG'))
expect('null で削除', request('PATCH', '/me', token, {'avatar': None})['user']['avatar'], None)

# ---- 拒否する値 ----
bad = {
    '数値': 3,
    '真偽値': True,
    'https の URL': 'https://example.com/a.png',
    'data URL でない': 'iVBORw0KGgo=',
    'text/plain': 'data:text/plain;base64,' + base64.b64encode(b'hello').decode(),
    'SVG（空でも拒否）': 'data:image/svg+xml;base64,'
                       + base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>').decode(),
    'GIF（許可しない形式）': 'data:image/gif;base64,' + base64.b64encode(b'GIF89a\x04\x00\x04\x00').decode(),
    '画像でない base64': data_url('image/png', b'not an image at all'),
    '不正な base64 文字': 'data:image/png;base64,not-an-image',
    'base64 の長さが 4 の倍数でない': 'data:image/png;base64,AAAAA',
    '詰め物のビットが不正': 'data:image/png;base64,AB==',
    '空の base64': 'data:image/png;base64,',
    '改行を含む': 'data:image/png;base64,AAAA\n',
    'パラメータ付き': 'data:image/png;charset=utf-8;base64,' + base64.b64encode(png_bytes()).decode(),
    '切り詰めた PNG': data_url('image/png', png_bytes()[:16]),
    'MIME と実体の不一致（PNG を JPEG と偽る）': data_url('image/jpeg', png_bytes()),
    'MIME と実体の不一致（JPEG を PNG と偽る）': data_url('image/png', JPEG),
    'MIME と実体の不一致（WebP を PNG と偽る）': data_url('image/png', WEBP),
    '縦横が大きすぎる（5000x5000）': data_url('image/png', png_claimed(5000, 5000)),
    '画素数が多すぎる（3000x3000）': data_url('image/png', png_claimed(3000, 3000)),
}
for label, value in bad.items():
    request('PATCH', '/me', token, {'avatar': value}, 400)
expect('拒否した値は保存しない', request('GET', '/me', token)['user']['avatar'], None)
expect('名前だけの更新は画像に影響しない',
       request('PATCH', '/me', token, {'name': '画像なし'})['user']['avatar'], None)

# ---- 復号後 200KB の境界 ----
ok = data_url('image/png', png_of_size(200 * 1024))
expect('復号後ちょうど 200KB は保存できる', request('PATCH', '/me', token, {'avatar': ok})['user']['avatar'], ok)
over = data_url('image/png', png_of_size(200 * 1024 + 1))
request('PATCH', '/me', token, {'avatar': over}, 400)
expect('復号後 200KB を超えると保存しない', request('GET', '/me', token)['user']['avatar'], ok)
request('PATCH', '/me', token, {'avatar': None})

# ---- 他の人にも公開情報として返る ----
request('PATCH', '/me', token, {'avatar': png})
expect('友達以外には見えない', request('GET', f"/users/{me['id']}", other_token, status=404)['error'] is not None, True)
s, r = call('POST', '/friends', {'handle': other['handle']}, token)
expect('友達申請', s, 200)
s, r = call('POST', f"/friend-requests/{me['id']}/accept", None, other_token)
expect('友達承認', s, 200)
expect('友達には画像が返る', request('GET', f"/users/{me['id']}", other_token)['user']['avatar'], png)
expect('自分にも同じ画像が返る', request('GET', '/me', token)['user']['avatar'], png)
