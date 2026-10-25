"""#130 ログイン試行制限。別送信元の失敗で本人が締め出されないこと、同じ送信元・分散の制限が残ることを確かめる"""
import time
from lib import call, expect, new_user

WRONG = 'wrongpass'
RIGHT = 'password123'

_n = 0
def src():
    """テスト用の送信元（RFC 5737 のテスト用アドレス帯）。手元でも送信元を分けて確かめる"""
    global _n; _n += 1
    return f'198.51.100.{_n}'

def login(handle, password, ip):
    return call('POST', '/login', {'handle': handle, 'password': password}, headers={'cf-connecting-ip': ip})

# 1. 別の送信元の失敗試行では本人がログインできる（#130 の回帰）
_t, u = new_user('thr')
attacker = src()
for i in range(10):
    s, _ = login(u['handle'], WRONG, attacker)
    expect(f'別送信元の失敗 {i + 1}', s, 401)
s, _ = login(u['handle'], WRONG, attacker)
expect('同じ送信元は上限で止まる', s, 429)
s, r = login(u['handle'], RIGHT, src())
expect('別送信元の失敗があっても本人はログインできる', s, 200)
expect('トークンが返る', 'token' in r, True)

# 2. 上限に達した送信元は、正しいパスワードでも止まる（同じ送信元の制限は維持）
s, _ = login(u['handle'], RIGHT, attacker)
expect('上限に達した送信元は正しいパスワードでも止まる', s, 429)

# 3. 送信元を変えた総当たりは段階的に遅くなる。正しいパスワードは通る
_t2, u2 = new_user('thr2')
for n in range(3):  # 3送信元 × 10回 = アカウント全体の上限（30回）
    ip = src()
    for i in range(10):
        s, _ = login(u2['handle'], WRONG, ip)
        expect(f'分散した失敗 {n}-{i + 1}', s, 401)
start = time.monotonic()
s, _ = login(u2['handle'], WRONG, src())
elapsed = time.monotonic() - start
expect('分散した失敗は401', s, 401)
expect('分散した失敗は遅らされる', elapsed >= 0.3, True)
s, _ = login(u2['handle'], RIGHT, src())
expect('分散した総当たり中でも本人はログインできる', s, 200)
