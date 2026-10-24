"""IDでの友達追加は申請にし、相手の承認で友達になる（#77）。"""
from concurrent.futures import ThreadPoolExecutor
from lib import call, expect, new_user, make_friends


def request(method, path, token=None, body=None, status=200):
    s, result = call(method, path, body, token)
    expect(f'{method} {path}', s, status)
    return result


def ids(users):
    return [u['id'] for u in users]


def pending(token):
    r = request('GET', '/friend-requests', token)
    for u in r['received'] + r['sent']:
        expect('公開情報のみ', set(u), {'id', 'handle', 'name', 'avatar'})
    return ids(r['received']), ids(r['sent'])


def friend_ids(token):
    return ids(request('GET', '/friends', token)['friends'])


# 未ログイン
request('GET', '/friend-requests', status=401)
request('POST', '/friend-requests/1/accept', status=401)
request('DELETE', '/friend-requests/1', status=401)

a, alice = new_user('frqA')
b, bob = new_user('frqB')
c, carol = new_user('frqC')
event = request('POST', '/events', b, {'title': '申請テスト', 'place': '', 'time_text': '', 'capacity': 4, 'duration_min': 60, 'group_id': None}, 201)['event']
epath = f"/events/{event['id']}"

# 申請: 友達にはならず、friend も返さない
expect('申請の応答', request('POST', '/friends', a, {'handle': bob['handle']}), {'status': 'requested'})
expect('申請は冪等', request('POST', '/friends', a, {'handle': ' ' + bob['handle'] + ' '}), {'status': 'requested'})
expect('送った申請', pending(a), ([], [bob['id']]))
expect('届いた申請', pending(b), ([alice['id']], []))
expect('第三者には見えない', pending(c), ([], []))
expect('承認前は友達でない（申請者）', friend_ids(a), [])
expect('承認前は友達でない（相手）', friend_ids(b), [])

# 承認前は見えない: プロフィールも募集も
request('GET', f"/users/{bob['id']}", a, status=404)
request('GET', f"/users/{alice['id']}", b, status=404)
request('GET', epath, a, status=404)
request('POST', epath + '/join', a, status=404)
expect('掲示板にも出ない', event['id'] in ids(request('GET', '/events', a)['events']), False)
request('GET', epath + '/messages', a, status=403)
expect('本人の request は none', request('GET', f"/users/{alice['id']}", a)['request'], 'none')

# 承認できるのは申請された人だけ
request('POST', f"/friend-requests/{bob['id']}/accept", a, status=404)
request('POST', f"/friend-requests/{alice['id']}/accept", c, status=404)
request('POST', f"/friend-requests/{alice['id']}/accept", a, status=400)
request('POST', '/friend-requests/99999999/accept', b, status=404)
request('POST', '/friend-requests/0/accept', b, status=400)
expect('不正な承認で友達にならない', friend_ids(a), [])

accepted = request('POST', f"/friend-requests/{alice['id']}/accept", b)
expect('承認の応答', accepted['status'], 'friends')
expect('承認の相手', accepted['friend'], {k: alice[k] for k in ('id', 'handle', 'name', 'avatar')})
expect('承認で相互（申請者）', friend_ids(a), [bob['id']])
expect('承認で相互（相手）', friend_ids(b), [alice['id']])
expect('承認後は申請が消える（申請者）', pending(a), ([], []))
expect('承認後は申請が消える（相手）', pending(b), ([], []))
expect('承認の再実行は冪等', request('POST', f"/friend-requests/{alice['id']}/accept", b)['status'], 'friends')
again = request('POST', '/friends', a, {'handle': bob['handle']})
expect('既に友達は200で friends', (again['status'], again['friend']['id']), ('friends', bob['id']))
expect('既に友達でも申請を作らない', pending(b), ([], []))
expect('友達の request は none', request('GET', f"/users/{bob['id']}", a), {'user': {k: bob[k] for k in ('id', 'handle', 'name', 'avatar')}, 'is_friend': True, 'request': 'none'})
request('GET', epath, a)
request('POST', '/friends', a, {'handle': alice['handle']}, 400)

# 友達を削除したら、もう一度申請からやり直す
request('DELETE', f"/friends/{bob['id']}", a)
expect('削除後の再追加は申請', request('POST', '/friends', a, {'handle': bob['handle']}), {'status': 'requested'})
request('GET', epath, a, status=404)

# 拒否: 届いた側が消す。承認はできなくなる
request('DELETE', f"/friend-requests/{alice['id']}", b)
expect('拒否後（申請者）', pending(a), ([], []))
expect('拒否後（相手）', pending(b), ([], []))
request('POST', f"/friend-requests/{alice['id']}/accept", b, status=404)
expect('拒否後も友達でない', friend_ids(b), [])
request('DELETE', f"/friend-requests/{alice['id']}", b)  # 無い申請の削除も200

# 取り消し: 送った側が消す
request('POST', '/friends', a, {'handle': carol['handle']})
request('DELETE', f"/friend-requests/{carol['id']}", a)
expect('取り消し後（相手）', pending(c), ([], []))
request('POST', f"/friend-requests/{alice['id']}/accept", c, status=404)

# 第三者は他人どうしの申請を消せない
request('POST', '/friends', a, {'handle': carol['handle']})
request('DELETE', f"/friend-requests/{alice['id']}", b)
expect('第三者の削除は影響しない', pending(c), ([alice['id']], []))

# お互いに申請したらすぐ友達になる
inverse = request('POST', '/friends', c, {'handle': alice['handle']})
expect('逆向きの申請で友達', (inverse['status'], inverse['friend']['id']), ('friends', alice['id']))
expect('逆向き（申請者）', friend_ids(a), [carol['id']])
expect('逆向きで申請が消える', (pending(a), pending(c)), (([], []), ([], [])))

# 招待リンクは承認なしで即時。申請中のものも消える
d, dave = new_user('frqD')
request('POST', '/friends', d, {'handle': bob['handle']})
invited = request('POST', '/friends', b, {'invite_code': dave['invite_code']})
expect('招待は即時で friend だけを返す', (set(invited), invited['friend']['id']), ({'friend'}, dave['id']))
expect('招待で友達', friend_ids(d), [bob['id']])
expect('招待で申請が消える', (pending(b), pending(d)), (([], []), ([], [])))
e, erin = new_user('frqE')
request('POST', '/friends', e, {'handle': dave['handle']})
request('POST', '/friends', e, {'invite_code': dave['invite_code']})  # 申請した側が招待を使う
expect('申請した側の招待でも申請が消える', (pending(d)[0], pending(e)[1]), ([], []))

# 参加者どうしのプロフィールで申請の状態が分かる
f, fay = new_user('frqF')
g, gil = new_user('frqG')
make_friends(f, fay, b, bob)
make_friends(g, gil, b, bob)
request('POST', epath + '/join', f)
request('POST', epath + '/join', g)
expect('未申請', request('GET', f"/users/{gil['id']}", f)['request'], 'none')
request('POST', '/friends', f, {'handle': gil['handle']})
expect('sent', request('GET', f"/users/{gil['id']}", f)['request'], 'sent')
expect('received', request('GET', f"/users/{fay['id']}", g)['request'], 'received')
request('DELETE', f"/friend-requests/{gil['id']}", f)
expect('取り消し後は none', request('GET', f"/users/{fay['id']}", g)['request'], 'none')

# 同時実行: 同じ申請の連打・逆向きの同時申請・承認と取り消しの競合
h, hal = new_user('frqH')
i, ivy = new_user('frqI')
with ThreadPoolExecutor(6) as pool:
    results = list(pool.map(lambda _: call('POST', '/friends', {'handle': ivy['handle']}, h), range(6)))
expect('連打はすべて200', {s for s, _ in results}, {200})
expect('連打でも申請は1件', pending(i), ([hal['id']], []))
request('DELETE', f"/friend-requests/{hal['id']}", i)
with ThreadPoolExecutor(2) as pool:
    results = list(pool.map(lambda args: call('POST', '/friends', {'handle': args[0]['handle']}, args[1]), [(ivy, h), (hal, i)]))
expect('同時の逆向き申請は200', [s for s, _ in results], [200, 200])
expect('どちらかで友達になる', 'friends' in [r['status'] for _, r in results], True)
expect('同時の逆向き申請で友達', friend_ids(h), [ivy['id']])
expect('同時の逆向き申請で申請が残らない', (pending(h), pending(i)), (([], []), ([], [])))
for n in range(5):
    j, jo = new_user('frqJ')
    k, kay = new_user('frqK')
    request('POST', '/friends', j, {'handle': kay['handle']})
    with ThreadPoolExecutor(2) as pool:
        accept = pool.submit(call, 'POST', f"/friend-requests/{jo['id']}/accept", None, k)
        cancel = pool.submit(call, 'DELETE', f"/friend-requests/{kay['id']}", None, j)
        (sa, ra), (sc, _) = accept.result(), cancel.result()
    expect(f'競合{n}: 取り消しは200', sc, 200)
    expect(f'競合{n}: 承認は200か404', sa in (200, 404), True)
    expect(f'競合{n}: 申請は残らない', (pending(j), pending(k)), (([], []), ([], [])))
    expect(f'競合{n}: 承認の結果と友達関係が一致', friend_ids(j), [kay['id']] if sa == 200 else [])
