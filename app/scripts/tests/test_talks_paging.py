"""トーク一覧のページング（#136）。応答は最大50件で、カーソルで欠落・重複なく辿れる。"""
from urllib.parse import quote
from lib import call, expect, new_user, make_friends

host, hu = new_user('talkPageH')
viewer, vu = new_user('talkPageV')
outsider, _ = new_user('talkPageO')
make_friends(viewer, vu, host, hu)

payload = dict(title='ページング', place='', time_text='', capacity=20, duration_min=15, group_id=None)
created = []  # (削除用トークン, イベントID)


def create(token, **over):
    s, r = call('POST', '/events', dict(payload, **over), token)
    expect('募集作成', s, 201)
    created.append((token, r['event']['id']))
    return r['event']['id']


def talks(token, cursor=None, limit=50):
    query = f'/talks?limit={limit}' + (f'&before={quote(cursor)}' if cursor is not None else '')
    s, r = call('GET', query, token=token)
    expect(f'GET {query}', s, 200)
    expect('最大50件', len(r['talks']) <= limit, True)
    return r


try:
    # 履歴を2ページ分（51件＋満員終了1件）と、自分が主催するトーク3件。
    for _ in range(51):
        eid = create(host)
        s, _ = call('POST', f'/events/{eid}/join', token=viewer)
        expect('参加', s, 200)
    full = create(host, title='満員終了', capacity=2, capacity_min=2)
    s, _ = call('POST', f'/events/{full}/join', token=viewer)
    expect('満員にする参加', s, 200)
    for i in range(3):
        create(viewer, title=f'主催{i}')

    # 期待する並び順（最新メッセージの時刻・ID・イベントIDの降順）をAPIから独立に作る。
    reference = []
    for _, eid in created:
        s, detail = call('GET', f'/events/{eid}', token=viewer); expect('募集詳細', s, 200)
        s, r = call('GET', f'/events/{eid}/messages', token=viewer); expect('メッセージ', s, 200)
        last = r['messages'][-1] if r['messages'] else None
        reference.append(((last['created_at'] if last else detail['event']['created_at'],
                           last['id'] if last else 0, eid), eid))
    reference.sort(reverse=True)
    expected = [eid for _, eid in reference]

    # 既定は50件まで。最後までカーソルで辿れて、欠落・重複がない。
    first = talks(viewer)
    expect('既定は50件', len(first['talks']), 50)
    expect('続きあり', isinstance(first['next'], str), True)
    seen, cursor, pages = [], None, 0
    while True:
        r = talks(viewer, cursor)
        seen += [t['event']['id'] for t in r['talks']]
        pages += 1
        cursor = r['next']
        if cursor is None:
            break
        if pages > 5:
            expect('ページ数', pages <= 5, True)
    expect('2ページで全件', pages, 2)
    expect('欠落なし・順序どおり', seen, expected)
    expect('重複なし', len(set(seen)), len(seen))
    expect('件数', len(seen), len(created))
    all_talks = {t['event']['id']: t for t in first['talks']}
    for r in [talks(viewer, first['next'])]:
        all_talks.update({t['event']['id']: t for t in r['talks']})
    expect('満員終了も含む', all_talks[full]['active'], False)
    expect('最終メッセージのイベントID', all_talks[full]['last']['event_id'], full)

    # 次のページの先頭に新着が来ても、古いカーソルのページに重複して出さない。
    moved = talks(viewer, first['next'])['talks'][0]['event']['id']
    s, _ = call('POST', f'/events/{moved}/messages', {'body': '新着'}, viewer)
    expect('新着投稿', s, 201)
    refreshed = talks(viewer)
    expect('新着は先頭', refreshed['talks'][0]['event']['id'], moved)
    older = talks(viewer, first['next'])
    older_ids = [t['event']['id'] for t in older['talks']]
    expect('移動したトークは過去ページに出ない', moved in older_ids, False)
    expect('ページ間で重複しない', set(t['event']['id'] for t in refreshed['talks']).isdisjoint(older_ids), True)
    # 新着後も最初から辿れば全件を欠落なく取得できる。
    replayed, cursor = [], None
    while True:
        r = talks(viewer, cursor)
        replayed += [t['event']['id'] for t in r['talks']]
        cursor = r['next']
        if cursor is None:
            break
    expect('新着後も欠落なし', sorted(replayed), sorted(expected))
    expect('新着後も重複なし', len(set(replayed)), len(replayed))

    # ページサイズとカーソルの入力チェック。
    one = talks(viewer, limit=1)
    expect('limit=1', len(one['talks']), 1)
    expect('limit=1 でも続きあり', isinstance(one['next'], str), True)
    for limit in ('0', '51', 'abc', '1.5', ''):
        s, _ = call('GET', f'/talks?limit={limit}', token=viewer)
        expect(f'limit={limit!r} は400', s, 400)
    for before in ('abc', '1:2', '1:2:0', '1:2:x', '1:2:3:4'):
        s, _ = call('GET', f'/talks?before={quote(before)}', token=viewer)
        expect(f'before={before!r} は400', s, 400)
    expect('第三者のトークは空', talks(outsider)['talks'], [])
    expect('第三者に続きは無い', talks(outsider)['next'], None)
finally:
    for token, eid in created:
        s, _ = call('DELETE', f'/events/{eid}', token=token)
        expect('募集削除', s, 200)
    expect('削除後はトークなし', talks(viewer)['talks'], [])

print('トーク一覧ページング API テスト完了')
