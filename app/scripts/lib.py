"""APIテストの共通部品。手元（localhost）以外には流さない"""
import json, sys, time, random, urllib.request, urllib.error
from urllib.parse import urlparse

BASE = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith('http') else 'http://localhost:8788'
if urlparse(BASE).hostname not in ('localhost', '127.0.0.1'):
    sys.exit('テストは手元のサーバー（localhost）にだけ流してください')

SUFFIX = f"{int(time.time()) % 100000}{random.randint(10, 99)}"

def call(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + '/api' + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'content-type': 'application/json', 'user-agent': 'kz2611-test', **({'authorization': 'Bearer ' + token} if token else {})})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')

def expect(label, got, want):
    if got != want:
        print(f'NG {label}: {got!r} != {want!r}'); sys.exit(1)
    print(f'ok {label}')

_n = 0
def new_user(prefix='u'):
    """新しいユーザーを登録して (token, user) を返す。テストごとに新しいユーザーを使う"""
    global _n; _n += 1
    s, r = call('POST', '/register', {'handle': f'{prefix}{SUFFIX}_{_n}', 'name': f'{prefix}{_n}', 'password': 'password123'})
    expect(f'register {prefix}{_n}', s, 201)
    return r['token'], r['user']
