from lib import call, expect, new_user

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
    # 前半の友達経由テストで作った通知は、競合検証から分離する。
    db.execute('DELETE FROM messages WHERE event_id = ?', (eid,)); db.commit()
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
    db.execute('UPDATE events SET expires_at = ? WHERE id = ?', (event['expires_at'], eid)); db.commit()
    s, _ = call('POST', path + '/join', token=winner); expect('削除前に再参加', s, 200)
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
s, _ = call('POST', '/friends', {'handle': user['handle']}, third); expect('3人目の友達追加', s, 200)
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
