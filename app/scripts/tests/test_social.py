from lib import call, expect, new_user


def request(method, path, token=None, body=None, status=200):
    s, r = call(method, path, body, token)
    expect(f'{method} {path}', s, status)
    return r


def public(user):
    expect('公開情報のみ', set(user), {'id', 'handle', 'name', 'avatar'})


a, alice = new_user('socA')
b, bob = new_user('socB')
request('GET', '/friends', status=401)
request('POST', '/friends', a, {'handle': bob['handle']})
friends = request('GET', '/friends', b)['friends']
expect('相互即時', [u['id'] for u in friends], [alice['id']])
public(friends[0])
request('POST', '/friends', b, {'invite_code': alice['invite_code']})
expect('重複なし', len(request('GET', '/friends', a)['friends']), 1)
for body in ({'handle': alice['handle']}, {'invite_code': alice['invite_code']}):
    request('POST', '/friends', a, body, 400)
for body in ({'handle': 'missing_social'}, {'invite_code': 'missing_social'}):
    request('POST', '/friends', a, body, 404)
for body in ({}, {'handle': ''}, {'handle': 7}, {'handle': bob['handle'], 'invite_code': bob['invite_code']}):
    request('POST', '/friends', a, body, 400)
public(request('GET', '/invite/' + bob['invite_code'], a)['user'])
request('GET', '/invite/missing_social', a, status=404)
request('GET', '/invite/' + bob['invite_code'], status=401)

request('PATCH', '/me', body={'name': '名前'}, status=401)
request('GET', f"/users/{alice['id']}", status=401)
expect('本人', request('GET', f"/users/{alice['id']}", a)['is_friend'], False)
expect('友達', request('GET', f"/users/{bob['id']}", a)['is_friend'], True)
public(request('GET', f"/users/{bob['id']}", a)['user'])
request('GET', '/users/99999999', a, status=404)
for body in ({'name': ''}, {'name': 'x' * 21}, {'name': None}, {'avatar': 3}, {'avatar': 'https://example.com/x'}, {'avatar': 'data:text/plain,x'}, {'avatar': 'data:image/png;base64,' + 'A' * 280000}):
    request('PATCH', '/me', a, body, 400)
image = 'data:image/png;base64,' + 'A' * (280000 - len('data:image/png;base64,'))
updated = request('PATCH', '/me', a, {'name': ' Zed ', 'avatar': image})['user']
expect('名前の更新', updated['name'], 'Zed')
expect('画像の上限', len(updated['avatar']), 280000)
expect('招待コード維持', updated['invite_code'], alice['invite_code'])
expect('保存確認', request('GET', '/me', a)['user'], updated)
expect('画像削除', request('PATCH', '/me', a, {'avatar': None})['user']['avatar'], None)
expect('空更新', request('PATCH', '/me', a, {})['user']['name'], 'Zed')
request('PATCH', '/me', b, {'name': 'Amy'})
c, carol = new_user('socC')
request('PATCH', '/me', c, {'name': 'Zoe'})
request('GET', f"/users/{carol['id']}", a, status=404)
request('POST', '/friends', a, {'invite_code': carol['invite_code']})
expect('招待コードで即時相互追加', [u['id'] for u in request('GET', '/friends', c)['friends']], [alice['id']])
expect('名前順', [u['name'] for u in request('GET', '/friends', a)['friends']], ['Amy', 'Zoe'])
request('DELETE', f"/friends/{carol['id']}", a)

request('GET', '/groups', status=401)
request('POST', '/groups', body={}, status=401)
request('GET', f"/users/{bob['id']}", a)
for body in ({'name': '', 'profile': '', 'member_ids': []}, {'name': 'x' * 21, 'profile': '', 'member_ids': []}, {'name': 'x', 'profile': 'x' * 101, 'member_ids': []}, {'name': 'x', 'profile': '', 'member_ids': 'bad'}, {'name': 'x', 'profile': '', 'member_ids': [99999999]}, {'name': 'x', 'profile': '', 'member_ids': [True]}, {'name': 'x', 'profile': '', 'member_ids': [str(bob['id'])]}, {'name': 'x', 'profile': '', 'member_ids': [alice['id']]}):
    request('POST', '/groups', a, body, 400)
expect('失敗時に作成しない', request('GET', '/groups', a)['groups'], [])
g = request('POST', '/groups', a, {'name': ' 仲間 ', 'profile': ' 紹介 ', 'member_ids': [bob['id'], bob['id']]}, 201)['group']
expect('グループの型', set(g), {'id', 'name', 'profile', 'owner_id', 'members'})
expect('名前', g['name'], '仲間')
expect('プロフィール', g['profile'], '紹介')
expect('作成者', g['owner_id'], alice['id'])
expect('メンバー重複なし・本人を含む', sorted(u['id'] for u in g['members']), sorted([alice['id'], bob['id']]))
for u in g['members']:
    public(u)
expect('友達にも表示', request('GET', '/groups', b)['groups'], [g])
request('DELETE', f"/groups/{g['id']}", b, status=403)
request('DELETE', f"/friends/{bob['id']}", a)
expect('相互削除', request('GET', '/friends', b)['friends'], [])
request('GET', f"/users/{bob['id']}", a, status=404)
expect('友達削除後も所属', request('GET', '/groups', b)['groups'], [g])
request('DELETE', f"/groups/{g['id']}", a)
expect('作成者から削除', request('GET', '/groups', a)['groups'], [])
expect('メンバーから削除', request('GET', '/groups', b)['groups'], [])
request('DELETE', f"/groups/{g['id']}", a, status=404)
solo = request('POST', '/groups', a, {'name': '一人', 'profile': '', 'member_ids': []}, 201)['group']
expect('本人だけでも作成', [u['id'] for u in solo['members']], [alice['id']])
expect('非メンバーには見えない', request('GET', '/groups', b)['groups'], [])
request('DELETE', f"/groups/{solo['id']}", a)
