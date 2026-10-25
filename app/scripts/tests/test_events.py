from lib import call, expect, new_user, make_friends

host, user = new_user('eventhost')
other, outsider = new_user('eventother')
payload = dict(title='カラオケ', place='駅前', time_text='19:00〜', capacity=2,
               duration_min=30, group_id=None)
s, _ = call('GET', '/events'); expect('認証が必要', s, 401)
s, r = call('POST', '/events', payload, host); expect('募集作成', s, 201)
event = r['event']; eid = event['id']; path = f'/events/{eid}'
expect('主催者', event['host'], {k: user[k] for k in ('id', 'handle', 'name', 'avatar')})
expect('主催者以外の参加者', event['members'], [])
expect('省略した下限は定員', event.get('capacity_min'), 2)
expect('主催者込み人数', event['count'], 1)
expect('主催者参加済み', event['joined'], True)
expect('主催者フラグ', event['is_host'], True)
expect('全体のグループ名', event['group_name'], None)
expect('表示期限', event['expires_at'], event['created_at'] + 30 * 60000)
s, r = call('GET', '/events?group=all', token=host); expect('一覧', s, 200)
expect('一覧に作成した募集', eid in [e['id'] for e in r['events']], True)
s, _ = call('GET', path, token=other); expect('他人には非公開', s, 404)
s, _ = call('POST', path + '/join', token=other); expect('非公開募集に参加不可', s, 404)
s, _ = call('PATCH', path, {'title': '変更'}, other); expect('他人は編集不可', s, 403)
s, _ = call('DELETE', path, token=other); expect('他人は削除不可', s, 403)
s, _ = call('DELETE', path + '/join', token=host); expect('主催者は取り消せない', s, 400)
for change in ({'title': ''}, {'title': 'a' * 21}, {'place': 'a' * 31},
               {'time_text': 'a' * 21}, {'capacity': 1}, {'capacity': 21},
               {'duration_min': 16}, {'group_id': 999999}, {'group_id': False}):
    s, _ = call('PATCH', path, change, host); expect(f'入力チェック {change}', s, 400)
s, r = call('PATCH', path, {'title': 'ご飯', 'duration_min': 15}, host)
expect('編集', s, 200); expect('編集タイトル', r['event']['title'], 'ご飯')
expect('作成日時は変わらない', r['event']['created_at'], event['created_at'])
expect('期限再計算', r['event']['expires_at'], event['created_at'] + 15 * 60000)
for change in ({'title': '期限を維持'}, {'duration_min': 15}):
    s, r = call('PATCH', path, change, host); expect('表示中の期限維持編集', s, 200)
    expect('durationが同じなら期限維持', r['event']['expires_at'], event['created_at'] + 15 * 60000)
# IDでの追加は申請と承認が要る（#77）。承認後の再追加は「既に友達」で200
make_friends(other, outsider, host, user)
s, _ = call('POST', '/friends', {'handle': user['handle']}, other)
if s == 404:
    print('skip 友達経由の参加・取り消し（friends API 未実装）')
else:
    expect('友達追加', s, 200)
    s, r = call('POST', path + '/join', token=other); expect('友達の募集へ参加', s, 200)
    expect('定員到達', r['event']['count'], 2)
    expect('参加者は主催者を含まない', [u['id'] for u in r['event']['members']], [outsider['id']])
    expect('参加済み', r['event']['joined'], True)
    expect('主催者でない', r['event']['is_host'], False)
    s, r = call('GET', '/events', token=host)
    expect('満員になった募集は掲示板から消える', eid in [e['id'] for e in r['events']], False)
    s, detail = call('GET', path, token=host)
    closed_at = detail['event']['expires_at']
    for change in ({'title': '終了後の編集'}, {'duration_min': 120}, {'capacity': 3}):
        s, edited = call('PATCH', path, change, host); expect('終了後の編集成功', s, 200)
        expect('満員終了の期限は維持', edited['event']['expires_at'], closed_at)
        s, board = call('GET', '/events', token=host)
        expect('編集しても満員終了は再公開しない', eid in [e['id'] for e in board['events']], False)
        s, talks = call('GET', '/talks', token=host)
        expect('編集しても終了トーク', next(t for t in talks['talks'] if t['event']['id'] == eid)['active'], False)
    s, _ = call('POST', path + '/join', token=other); expect('満員終了後の重複参加は不可', s, 400)
    s, _ = call('PATCH', path, {'capacity': 1}, host); expect('参加人数未満の定員不可', s, 400)
    s, r = call('DELETE', path + '/join', token=other); expect('参加取り消し', s, 200)
    expect('人数が戻る', r['event']['count'], 1)
    expect('参加解除', r['event']['joined'], False)
    s, _ = call('DELETE', path + '/join', token=other); expect('重複取り消しは冪等', s, 200)
# ローカルD1ファイルを明示した場合だけ、他機能に依存しない境界値検証を行う。
import os
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

db_path = os.environ.get('KZ_EVENTS_TEST_DB')
if db_path:
    db_path = Path(db_path).resolve()
    local_state = Path(__file__).resolve().parents[2] / '.wrangler/state/v3/d1'
    if local_state.resolve() not in db_path.parents:
        raise RuntimeError('DBフィクスチャはこのクローンのローカルD1だけに使用できます')
    db = sqlite3.connect(str(db_path))
    # 自然期限切れ（期限は作成時刻＋表示時間のまま）も延長して復活させない。
    s, expired = call('POST', '/events', payload, host); expect('自然終了用募集', s, 201)
    expired_path = f"/events/{expired['event']['id']}"
    expired_at = expired['event']['created_at'] - 60000
    db.execute('UPDATE events SET created_at = ?, expires_at = ? WHERE id = ?',
               (expired_at - 30 * 60000, expired_at, expired['event']['id'])); db.commit()
    for change in ({'title': '自然終了後'}, {'duration_min': 120}, {'capacity': 4}):
        s, edited = call('PATCH', expired_path, change, host); expect('自然終了後編集', s, 200)
        expect('自然終了の期限維持', edited['event']['expires_at'], expired_at)
        s, board = call('GET', '/events', token=host)
        expect('自然終了を再公開しない', expired['event']['id'] in [e['id'] for e in board['events']], False)
    s, _ = call('DELETE', expired_path, token=host); expect('自然終了用削除', s, 200)
    # 最後の一人の参加と編集が競合しても、どちらの実行順でも終了を維持する。
    for index in range(8):
        s, race = call('POST', '/events', payload, host); expect('編集競合用作成', s, 201)
        race_path = f"/events/{race['event']['id']}"
        with ThreadPoolExecutor(max_workers=2) as pool:
            join = pool.submit(call, 'POST', race_path + '/join', None, other)
            edit = pool.submit(call, 'PATCH', race_path, {'duration_min': 120, 'title': '競合編集'}, host)
            expect('編集競合の参加', join.result()[0], 200)
            expect('編集競合の編集', edit.result()[0], 200)
        s, talks = call('GET', '/talks', token=host)
        expect('編集競合でも終了', next(t for t in talks['talks'] if t['event']['id'] == race['event']['id'])['active'], False)
        s, board = call('GET', '/events', token=host)
        expect('編集競合でも非公開', race['event']['id'] in [e['id'] for e in board['events']], False)
        s, _ = call('DELETE', race_path, token=host); expect('編集競合用削除', s, 200)
    # 終了募集を再利用せず、競合検証用の新しい募集を作る。
    s, _ = call('DELETE', path, token=host); expect('前半の募集を削除', s, 200)
    s, r = call('POST', '/events', payload, host); expect('競合用募集作成', s, 201)
    event = r['event']; eid = event['id']; path = f'/events/{eid}'
    third, third_user = new_user('eventthird')
    cursor = db.execute('INSERT INTO groups (owner_id, name, profile, created_at) VALUES (?, ?, ?, ?)',
                        (user['id'], 'テストグループ', '', event['created_at']))
    gid = cursor.lastrowid
    db.executemany('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
                   [(gid, u['id']) for u in (user, outsider, third_user)])
    db.commit()
    s, r = call('PATCH', path, {'group_id': gid}, host); expect('グループに変更', s, 200)
    expect('グループ名', r['event']['group_name'], 'テストグループ')
    s, r = call('GET', f'/events?group={gid}', token=other)
    expect('グループで絞り込み', [e['id'] for e in r['events']], [eid])
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda t: call('POST', path + '/join', token=t), [other, third]))
    expect('最後の1枠の競合', sorted(s for s, _ in results), [200, 400])
    winner = other if results[0][0] == 200 else third
    winner_user = outsider if winner == other else third_user
    expect('DBでも定員以内', db.execute('SELECT COUNT(*) FROM event_members WHERE event_id = ?', (eid,)).fetchone()[0], 1)
    expect('主催者は参加テーブルに入らない', db.execute('SELECT COUNT(*) FROM event_members WHERE event_id = ? AND user_id = ?', (eid, user['id'])).fetchone()[0], 0)
    s, _ = call('POST', path + '/join', token=winner); expect('満員終了後の重複参加', s, 400)
    expect('参加通知は1件', db.execute('SELECT body, kind FROM messages WHERE event_id = ?', (eid,)).fetchall(), [(winner_user['name'] + 'が参加しました', 'system'), ('人数がそろったので募集を終了しました', 'system')])
    s, r = call('GET', '/talks', token=winner)
    expect('競合時も満員で終了', next(t for t in r['talks'] if t['event']['id'] == eid)['active'], False)
    s, r = call('GET', '/events', token=host)
    expect('競合時も掲示板から消える', eid in [e['id'] for e in r['events']], False)
    db.execute('UPDATE events SET expires_at = ? WHERE id = ?', (event['created_at'] - 1, eid)); db.commit()
    s, r = call('GET', '/events', token=host)
    expect('終了募集は一覧から除外', eid in [e['id'] for e in r['events']], False)
    s, _ = call('GET', path, token=winner); expect('終了後も参加者は詳細を見られる', s, 200)
    s, _ = call('POST', path + '/join', token=other); expect('終了後は参加不可', s, 400)
    s, r = call('DELETE', path + '/join', token=winner); expect('終了後も取り消せる', s, 200)
    expect('取り消し後人数', r['event']['count'], 1)
    s, _ = call('DELETE', path + '/join', token=winner); expect('重複取り消し', s, 200)
    expect('退会通知も1件', db.execute('SELECT body, kind FROM messages WHERE event_id = ? ORDER BY id', (eid,)).fetchall(), [(winner_user['name'] + 'が参加しました', 'system'), ('人数がそろったので募集を終了しました', 'system'), (winner_user['name'] + 'が抜けました', 'system')])
    # 終了後の参加取消と編集でも再公開しない。
    s, r = call('PATCH', path, {'duration_min': 120, 'title': '取消後の編集'}, host)
    expect('取消後編集', s, 200)
    s, _ = call('POST', path + '/join', token=winner); expect('取消後も再参加不可', s, 400)
    s, _ = call('DELETE', path, token=host); expect('募集削除', s, 200)
    for table in ('events', 'event_members', 'messages'):
        column = 'id' if table == 'events' else 'event_id'
        expect('削除連動 ' + table, db.execute(f'SELECT COUNT(*) FROM {table} WHERE {column} = ?', (eid,)).fetchone()[0], 0)
    db.execute('DELETE FROM group_members WHERE group_id = ?', (gid,))
    db.execute('DELETE FROM groups WHERE id = ?', (gid,)); db.commit(); db.close()
else:
    print('skip D1境界値検証（KZ_EVENTS_TEST_DB 未指定）')
    s, _ = call('DELETE', path, token=host); expect('募集削除', s, 200)
s, _ = call('GET', path, token=host); expect('削除後404', s, 404)

# 人数の幅: 作成・編集・全EventItem経路・既存データの互換性。
for minimum in (0, 1, 21, 2.5, True, None):
    s, _ = call('POST', '/events', dict(payload, capacity=3, capacity_min=minimum), host)
    expect(f'下限の入力チェック {minimum!r}', s, 400)
s, _ = call('POST', '/events', dict(payload, capacity=3, capacity_min=4), host)
expect('下限が上限を超える作成は不可', s, 400)
s, r = call('POST', '/events', dict(payload, capacity=3, capacity_min=2), host)
expect('幅を持つ募集作成', s, 201)
rid = r['event']['id']; rp = f'/events/{rid}'
expect('作成した下限', r['event']['capacity_min'], 2)
expect('作成した上限', r['event']['capacity'], 3)
for endpoint, collection in (('/events', 'events'), ('/talks', 'talks')):
    s, r = call('GET', endpoint, token=host); expect(endpoint, s, 200)
    entries = r[collection] if collection == 'events' else [t['event'] for t in r[collection]]
    expect(endpoint + 'の下限', next(e for e in entries if e['id'] == rid)['capacity_min'], 2)
s, r = call('GET', rp, token=host); expect('詳細の下限', r['event']['capacity_min'], 2)
for minimum in (0, 1, 21, 2.5, True, None, 4):
    s, _ = call('PATCH', rp, {'capacity_min': minimum}, host)
    expect(f'編集の下限チェック {minimum!r}', s, 400)
s, r = call('PATCH', rp, {'capacity': 20, 'capacity_min': 20}, host)
expect('最大値の編集', s, 200); expect('最大下限', r['event']['capacity_min'], 20)
s, r = call('PATCH', rp, {'capacity': 3}, host)
expect('編集の下限省略', s, 200); expect('省略時は上限', r['event']['capacity_min'], 3)
s, r = call('PATCH', rp, {'capacity_min': 2}, host); expect('下限だけ編集', s, 200)
# 主催者のjoinも同じEventItemを返す。
s, r = call('POST', rp + '/join', token=host)
expect('参加レスポンスの下限', r['event']['capacity_min'], 2)
if db_path:
    db = sqlite3.connect(str(db_path))
    db.execute('UPDATE events SET capacity_min = 0 WHERE id = ?', (rid,)); db.commit()
    for endpoint, collection in ((rp, None), ('/events', 'events'), ('/talks', 'talks')):
        s, r = call('GET', endpoint, token=host)
        entries = [r['event']] if collection is None else r[collection] if collection == 'events' else [t['event'] for t in r[collection]]
        expect(endpoint + 'は既存の0を返す', next(e for e in entries if e['id'] == rid)['capacity_min'], 0)
    db.close()
# 下限に達しても上限までは参加できる。
s, _ = call('POST', '/friends', {'handle': user['handle']}, other); expect('幅テストの友達追加', s, 200)
third, third_user = new_user('rangeThird')
make_friends(third, third_user, host, user)
for token, count in ((other, 2), (third, 3)):
    s, r = call('POST', rp + '/join', token=token)
    expect('上限までは参加できる', s, 200); expect('参加人数', r['event']['count'], count)
    if count == 2:
        expect('下限では募集を終了しない', r['event']['expires_at'] > r['event']['created_at'], True)
        s, messages = call('GET', rp + '/messages', token=host)
        expect('下限では終了通知なし', any(m['body'] == '人数がそろったので募集を終了しました' for m in messages['messages']), False)
    else:
        closed_at = r['event']['expires_at']
        s, talks = call('GET', '/talks', token=token)
        talk = next(t for t in talks['talks'] if t['event']['id'] == rid)
        expect('満員のトークは終了', talk['active'], False)
        s, messages = call('GET', rp + '/messages', token=token)
        notices = [m for m in messages['messages'] if m['body'] == '人数がそろったので募集を終了しました']
        expect('終了通知は1件', len(notices), 1)
        expect('終了通知はsystem', notices[0]['kind'], 'system')
        expect('終了時刻は通知時刻', closed_at, notices[0]['created_at'])
        s, _ = call('POST', rp + '/messages', {'body': '終了後も相談する'}, token)
        expect('満員終了後も投稿できる', s, 201)
        s, _ = call('POST', rp + '/join', token=token)
        expect('終了後は再参加不可', s, 400)
        s, detail = call('GET', rp, token=token)
        expect('重複参加で終了時刻が変わらない', detail['event']['expires_at'], closed_at)
s, _ = call('PATCH', rp, {'capacity': 2, 'capacity_min': 2}, host)
expect('現在人数未満への縮小不可', s, 400)
s, r = call('DELETE', rp + '/join', token=third)
expect('参加取消レスポンスに下限', 'capacity_min' in r['event'], True)
s, _ = call('DELETE', rp, token=host); expect('幅テストの募集削除', s, 200)

# #138 表示中の募集を現在人数まで縮めて満員になったら、終了とシステムメッセージを確定する。
sh, sh_user = new_user('shrinkhost')
sg, sg_user = new_user('shrinkguest')
make_friends(sh, sh_user, sg, sg_user)
s, r = call('POST', '/events', dict(payload, title='定員縮小', capacity=3), sh)
expect('縮小用募集作成', s, 201)
sid = r['event']['id']; sp = f'/events/{sid}'
s, _ = call('POST', sp + '/join', token=sg); expect('縮小前の参加', s, 200)
s, r = call('PATCH', sp, {'capacity': 3}, sh)
expect('満員でない縮小', s, 200)
expect('満員でない縮小は継続', r['event']['expires_at'] > r['event']['created_at'], True)
s, r = call('PATCH', sp, {'capacity': 2}, sh)
expect('現在人数までの縮小', s, 200)
shut = r['event']['expires_at']
s, talks = call('GET', '/talks', token=sh)
expect('縮小でトークも終了', next(t for t in talks['talks'] if t['event']['id'] == sid)['active'], False)
s, board = call('GET', '/events', token=sh)
expect('縮小で掲示板から消える', sid in [e['id'] for e in board['events']], False)
s, messages = call('GET', sp + '/messages', token=sh)
notices = [m for m in messages['messages'] if m['body'] == '人数がそろったので募集を終了しました']
expect('縮小の終了通知は1件', len(notices), 1)
expect('縮小の終了通知はsystem', notices[0]['kind'], 'system')
expect('縮小の終了時刻は通知時刻', notices[0]['created_at'], shut)
s, r = call('PATCH', sp, {'capacity': 2}, sh)
expect('同じ縮小の再送', s, 200)
expect('再送で終了時刻は変わらない', r['event']['expires_at'], shut)
s, messages = call('GET', sp + '/messages', token=sh)
expect('再送で通知は増えない', [m['body'] for m in messages['messages']].count('人数がそろったので募集を終了しました'), 1)
s, r = call('PATCH', sp, {'duration_min': 120}, sh)
expect('縮小終了後の編集', s, 200)
expect('縮小終了後も再公開しない', r['event']['expires_at'], shut)
s, _ = call('PATCH', sp, {'capacity': 1}, sh); expect('縮小終了後の人数未満', s, 400)
# 定員縮小と参加が同時でも、終了と通知を1件だけにする。
st, st_user = new_user('shrinkrace')
make_friends(st, st_user, sh, sh_user)
s, r = call('POST', '/events', dict(payload, title='縮小競合', capacity=3), sh)
expect('縮小競合用作成', s, 201)
rid2 = r['event']['id']; rp2 = f'/events/{rid2}'
s, _ = call('POST', rp2 + '/join', token=sg); expect('縮小競合の事前参加', s, 200)
with ThreadPoolExecutor(max_workers=2) as pool:
    join = pool.submit(call, 'POST', rp2 + '/join', None, st)
    shrink = pool.submit(call, 'PATCH', rp2, {'capacity': 2}, sh)
    join_result = join.result(); shrink_result = shrink.result()
expect('縮小競合の参加は200か400', join_result[0] in (200, 400), True)
expect('縮小競合の縮小は200か400', shrink_result[0] in (200, 400), True)
expect('縮小競合のどちらかは成功', 200 in (join_result[0], shrink_result[0]), True)
s, detail = call('GET', rp2, token=sh)
expect('縮小競合でも定員以内', detail['event']['count'] <= detail['event']['capacity'], True)
s, talks = call('GET', '/talks', token=sh)
expect('縮小競合でもトーク終了', next(t for t in talks['talks'] if t['event']['id'] == rid2)['active'], False)
s, messages = call('GET', rp2 + '/messages', token=sh)
expect('縮小競合の終了通知は1件', [m['body'] for m in messages['messages']].count('人数がそろったので募集を終了しました'), 1)
s, _ = call('DELETE', rp2, token=sh); expect('縮小競合の募集削除', s, 200)
s, _ = call('DELETE', sp, token=sh); expect('縮小用募集削除', s, 200)

# #139 退会・グループ削除後も、公開範囲を変えない編集は主催者にできる。
lh, lh_user = new_user('leavehost')
lm, lm_user = new_user('leaveguest')
make_friends(lh, lh_user, lm, lm_user)
s, r = call('POST', '/groups', {'name': '退会後の編集', 'profile': '', 'member_ids': [lm_user['id']]}, lh)
expect('退会テストのグループ作成', s, 201)
lgid = r['group']['id']
s, r = call('POST', '/events', dict(payload, title='退会前', capacity=4, group_id=lgid), lh)
expect('退会テストの募集作成', s, 201)
leid = r['event']['id']; lp = f'/events/{leid}'
s, _ = call('POST', lp + '/join', token=lm); expect('退会前の参加', s, 200)
s, _ = call('POST', lp + '/messages', {'body': '退会前の相談'}, lm); expect('退会前のチャット', s, 201)
s, _ = call('DELETE', f'/groups/{lgid}/members/{lh_user["id"]}', token=lh); expect('主催者の退会', s, 200)
s, r = call('PATCH', lp, {'title': '退会後'}, lh)
expect('退会後も公開範囲を変えずに編集', s, 200)
expect('退会後もグループを保持', r['event']['group_id'], lgid)
s, r = call('POST', '/groups', {'name': '未所属の編集', 'profile': '', 'member_ids': []}, lm)
expect('未所属グループ作成', s, 201); ngid = r['group']['id']
s, _ = call('PATCH', lp, {'group_id': ngid}, lh)
expect('未所属グループへの公開先変更は不可', s, 400)
s, _ = call('POST', '/events', dict(payload, title='未所属', group_id=ngid), lh)
expect('未所属グループへの新規作成は不可', s, 400)
s, _ = call('DELETE', f'/groups/{lgid}', token=lm); expect('グループ削除', s, 200)
s, r = call('PATCH', lp, {'title': 'グループ削除後'}, lh)
expect('グループ削除後も編集', s, 200)
expect('グループ削除後も公開範囲を保持', r['event']['group_id'], lgid)
s, _ = call('GET', lp, token=lm); expect('削除後も参加者は詳細を見られる', s, 200)
s, messages = call('GET', lp + '/messages', token=lm)
expect('削除後もチャットを保持', any(m['body'] == '退会前の相談' for m in messages['messages']), True)
s, _ = call('PATCH', lp, {'title': '他人の編集'}, lm); expect('非主催者は編集不可', s, 403)
s, r = call('PATCH', lp, {'group_id': None}, lh)
expect('全体への公開先変更', s, 200); expect('全体に変更', r['event']['group_id'], None)
s, _ = call('PATCH', lp, {'group_id': lgid}, lh)
expect('未所属の削除済みグループへは変更不可', s, 400)
s, _ = call('DELETE', lp, token=lh); expect('退会テストの募集削除', s, 200)
s, _ = call('DELETE', f'/groups/{ngid}', token=lm); expect('未所属グループ削除', s, 200)

# #140 募集の整数項目は配列・オブジェクト・真偽値・null・数値文字列を受け付けない。
type_title = '型チェック'
def type_events(token):
    s, r = call('GET', '/events?group=all', token=token)
    expect('型チェックの一覧', s, 200)
    return [e for e in r['events'] if e['title'] == type_title]
bad_ints = ([3], {'a': 1}, True, None, '3')
before = len(type_events(sh))
for field in ('capacity', 'capacity_min', 'duration_min'):
    for value in bad_ints:
        s, _ = call('POST', '/events', dict(payload, title=type_title, **{field: value}), sh)
        expect(f'非整数の作成 {field} {value!r}', s, 400)
expect('不正入力では募集が増えない', len(type_events(sh)), before)
s, r = call('POST', '/events', dict(payload, title=type_title, capacity=3, capacity_min=2), sh)
expect('型チェック用募集作成', s, 201)
type_id = r['event']['id']; type_path = f'/events/{type_id}'
for field in ('capacity', 'capacity_min', 'duration_min'):
    for value in bad_ints:
        s, _ = call('PATCH', type_path, {field: value}, sh)
        expect(f'非整数の編集 {field} {value!r}', s, 400)
s, r = call('GET', type_path, token=sh)
expect('不正な編集では値が変わらない', (r['event']['capacity'], r['event']['capacity_min'], r['event']['duration_min']), (3, 2, 30))
s, _ = call('DELETE', type_path, token=sh); expect('型チェック用募集削除', s, 200)
if db_path:
    db = sqlite3.connect(str(db_path))
    expect('不正入力はDBにも残らない', db.execute('SELECT COUNT(*) FROM events WHERE title = ?', (type_title,)).fetchone()[0], 0)
    db.close()
