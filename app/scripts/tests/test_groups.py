from lib import call, expect, new_user

owner, o = new_user('groupowner')
a, ua = new_user('groupa')
b, ub = new_user('groupb')
x, ux = new_user('groupx')
for user in (ua, ub):
    s, _ = call('POST', '/friends', {'invite_code': user['invite_code']}, owner)
    expect('招待コードで友達', s, 200)
s, r = call('POST', '/groups', {'name': '研究室', 'profile': '', 'member_ids': [ua['id']]}, owner)
expect('作成', s, 201)
p = '/groups/' + str(r['group']['id'])
s, r = call('PATCH', p, {'name': '新しい研究室', 'profile': 'いつもの仲間'}, owner)
expect('作成者が編集', s, 200)
expect('名前更新', r['group']['name'], '新しい研究室')
expect('プロフィール更新', r['group']['profile'], 'いつもの仲間')
for token in (a, x):
    s, _ = call('PATCH', p, {'name': '禁止'}, token); expect('作成者以外は編集不可', s, 403)
    s, _ = call('POST', p + '/members', {'user_id': ub['id']}, token); expect('作成者以外は追加不可', s, 403)
    s, _ = call('DELETE', p + '/members/' + str(ua['id']), token=token) if token == x else call('DELETE', p + '/members/' + str(o['id']), token=token)
    expect('作成者以外は他人を削除不可', s, 403)
for change in ({'name': ''}, {'name': 'a' * 21}, {'profile': 'a' * 101}, {'profile': None}):
    s, _ = call('PATCH', p, change, owner); expect('編集入力チェック', s, 400)
for value in (ux['id'], True, '2', 1.5):
    s, _ = call('POST', p + '/members', {'user_id': value}, owner); expect('追加入力と友達チェック', s, 400)
for _ in range(2):
    s, _ = call('POST', p + '/members', {'user_id': ub['id']}, owner); expect('追加は冪等', s, 200)
s, r = call('GET', '/groups', token=b)
expect('追加後に一覧表示', len(r['groups']), 1)
# 参加していない募集は退会・除外で非表示。参加済みは参加者として残す。
payload = dict(title='グループ募集', place='', time_text='', capacity=5, duration_min=30, group_id=int(p.split('/')[-1]))
s, r = call('POST', '/events', payload, owner); expect('募集作成', s, 201)
eid = r['event']['id']
s, _ = call('POST', f'/events/{eid}/join', token=a); expect('参加', s, 200)
s, _ = call('DELETE', p + '/members/' + str(ub['id']), token=owner); expect('作成者が削除', s, 200)
s, r = call('GET', '/events', token=b); expect('除外後は非表示', eid in [e['id'] for e in r['events']], False)
s, _ = call('DELETE', p + '/members/' + str(ua['id']), token=a); expect('メンバーが抜ける', s, 200)
s, r = call('GET', '/events/' + str(eid), token=a); expect('抜けても参加者のまま', r['event']['joined'], True)
s, _ = call('POST', p + '/members', {'user_id': ub['id']}, owner); expect('再追加', s, 200)
s, _ = call('POST', p + '/members', {'user_id': ua['id']}, owner); expect('再追加2', s, 200)
s, _ = call('DELETE', p + '/members/' + str(o['id']), token=owner); expect('作成者が抜ける', s, 200)
s, r = call('GET', '/groups', token=a); expect('最小user_idへ引き継ぎ', r['groups'][0]['owner_id'], ua['id'])
s, _ = call('PATCH', p, {'name': '引継ぎ後'}, a); expect('新作成者が編集', s, 200)
s, _ = call('DELETE', p + '/members/' + str(ub['id']), token=b); expect('一般メンバー退会', s, 200)
s, _ = call('DELETE', p + '/members/' + str(ua['id']), token=a); expect('最後の一人が退会', s, 200)
s, r = call('GET', '/groups', token=a); expect('空グループ削除', r['groups'], [])
s, _ = call('PATCH', p, {'name': '消えた'}, a); expect('削除後404', s, 404)
s, r = call('GET', '/events/' + str(eid), token=a); expect('削除後も参加者は残る', r['event']['joined'], True)
