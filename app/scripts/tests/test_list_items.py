"""D1の通常のバインド上限を超える一覧でも、項目・所属・並び順を保つ。"""
from urllib.parse import quote
from lib import call, expect, new_user, make_friends

host, host_user = new_user('listHost')
member, member_user = new_user('listMember')
make_friends(member, member_user, host, host_user)
groups, ids = [], []
try:
    for i in range(105):
        s, r = call('POST', '/groups', dict(name='一覧グループ', profile=str(i),
                                           member_ids=[member_user['id']]), host)
        expect('一括取得用グループ作成', s, 201)
        groups.append(r['group'])
        s, r = call('POST', '/events', dict(title=f'一覧{i}', place=str(i), time_text='夜',
                     capacity=3, capacity_min=2, duration_min=15 if i % 2 else 30,
                     group_id=groups[-1]['id']), host)
        expect('一括取得用募集作成', s, 201)
        eid = r['event']['id']; ids.append(eid)
        s, _ = call('POST', f'/events/{eid}/join', token=member)
        expect('一括取得用参加', s, 200)
    for token in (host, member):
        s, r = call('GET', '/groups', token=token); expect('大量グループ取得', s, 200)
        expect('グループの順序・公開メンバー・対応付け', r['groups'], groups)
        s, r = call('GET', '/events', token=token); expect('大量募集取得', s, 200)
        events = r['events']
        expect('募集を欠落なく取得', sorted(e['id'] for e in events), ids)
        expect('募集の期限・ID順', [(e['expires_at'], e['id']) for e in events],
               sorted((e['expires_at'], e['id']) for e in events))
        s, r = call('GET', '/talks', token=token); expect('大量トーク取得', s, 200)
        talks, cursor = list(r['talks']), r['next']
        while cursor is not None:
            s, r = call('GET', '/talks?limit=50&before=' + quote(cursor), token=token)
            expect('大量トークの続き', s, 200)
            talks += r['talks']; cursor = r['next']
        expect('トークを欠落なく取得', sorted(t['event']['id'] for t in talks), ids)
        expect('トークの最終日時・ID順',
               [(t['last']['created_at'], t['last']['id'], t['event']['id']) for t in talks],
               sorted(((t['last']['created_at'], t['last']['id'], t['event']['id']) for t in talks), reverse=True))
        board_by_id = {e['id']: e for e in events}
        for talk in talks:
            expect('掲示板とトークのEventItem完全一致', talk['event'], board_by_id[talk['event']['id']])
        for i in (0, 52, 104):
            eid = ids[i]
            s, r = call('GET', f'/events/{eid}', token=token); expect('大量一覧の詳細', s, 200)
            expect('詳細と一覧のEventItem完全一致', r['event'], board_by_id[eid])
            expect('参加者が別募集と混ざらない', [u['id'] for u in r['event']['members']], [member_user['id']])
            expect('グループ名の対応', r['event']['group_name'], groups[i]['name'])
            s, r = call('GET', f'/events/{eid}/messages', token=token)
            expect('最終メッセージの全項目', next(t for t in talks if t['event']['id'] == eid)['last'], r['messages'][-1])
finally:
    for eid in ids:
        s, _ = call('DELETE', f'/events/{eid}', token=host); expect('大量募集削除', s, 200)
    for group in groups:
        s, _ = call('DELETE', f"/groups/{group['id']}", token=host); expect('大量グループ削除', s, 200)
