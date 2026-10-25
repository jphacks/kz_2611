from lib import call, expect, new_user, SUFFIX
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

# 複数端末が同じIDで登録しても、作成は1件・残りは409にする（#158）。
# 開始を揃え、パスワードのハッシュ計算中に重なる競合を実APIで確認する。
for round_no in range(3):
    barrier = Barrier(8)
    handle = f'race{SUFFIX}_{round_no}'
    def register(i):
        barrier.wait()
        return call('POST', '/register', {
            'handle': handle, 'name': f'同時登録{i}', 'password': f'password{i}123',
        })
    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(register, range(8)))
    expect('同時登録の成功は1件', sum(status == 201 for status, _ in responses), 1)
    expect('同時登録の重複はすべて409', sorted(status for status, _ in responses), [201] + [409] * 7)
    winner = next(i for i, (status, _) in enumerate(responses) if status == 201)
    user = responses[winner][1]['user']
    status, result = call('POST', '/login', {'handle': handle, 'password': f'password{winner}123'})
    expect('同時登録の勝者でログインできる', status, 200)
    expect('同時登録でユーザーを上書きしない', result['user'], user)
    status, result = call('GET', '/me', token=responses[winner][1]['token'])
    expect('同時登録のセッションが有効', status, 200)
    expect('同時登録のセッションは作成ユーザーに紐づく', result['user'], user)
s, _ = call('GET', '/health'); expect('health', s, 200)
s, _ = call('GET', '/me'); expect('me without token', s, 401)
t, u = new_user('auth')
s, r = call('GET', '/me', token=t); expect('me', s, 200); expect('me handle', r['user']['handle'], u['handle'])
expect('no pass_hash', 'pass_hash' in r['user'], False)
s, _ = call('POST', '/register', {'handle': u['handle'], 'name': 'x', 'password': 'password123'}); expect('dup handle', s, 409)
s, _ = call('POST', '/login', {'handle': u['handle'], 'password': 'wrongpass'}); expect('wrong password', s, 401)
s, r = call('POST', '/login', {'handle': u['handle'], 'password': 'password123'}); expect('login', s, 200)
s, _ = call('POST', '/logout', token=r['token']); expect('logout', s, 200)
s, _ = call('GET', '/me', token=r['token']); expect('me after logout', s, 401)
