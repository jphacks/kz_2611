import sys
from lib import call, expect, new_user

for method, path in [('GET', '/talks'), ('GET', '/events/1/messages'), ('POST', '/events/1/messages')]:
    status, _ = call(method, path)
    expect(f'{method} {path} 未認証', status, 401)

host, hu = new_user('chatH')
member, mu = new_user('chatM')
outsider, _ = new_user('chatO')

def request(method, path, token=host, body=None, status=200):
    s, r = call(method, path, body, token)
    expect(f'{method} {path}', s, status)
    return r

payload = dict(title='チャットテスト', place='駅前', time_text='19:00', capacity=4, duration_min=15, group_id=None)
s, r = call('POST', '/events', payload, host)
if s == 404:
    print('#1 未マージのため skip')
    sys.exit(0)
expect('イベント作成', s, 201)
eid = r['event']['id']
path = f'/events/{eid}/messages'
expect('主催者はメッセージなしでもトークを持つ', request('GET', '/talks')['talks'][0]['last'], None)
request('GET', path, outsider, status=403)
request('POST', path, outsider, {'body': '読めない'}, status=403)
request('GET', '/events/999999999/messages', status=403)
expect('第三者のトークは空', request('GET', '/talks', outsider)['talks'], [])
# 全体募集への参加に必要な友達関係も API で準備する。
request('POST', '/friends', member, {'handle': hu['handle']})
request('POST', f'/events/{eid}/join', member)
messages = request('GET', path, member)['messages']
expect('参加システムメッセージ', any(m['kind'] == 'system' and '参加しました' in m['body'] for m in messages), True)

for value in ['', '  ', 'x' * 501, None, 123]:
    request('POST', path, body={'body': value}, status=400)
for after in ['-1', '1.2', 'abc']:
    request('GET', path + '?after=' + after, status=400)

first = request('POST', path, body={'body': '  こんにちは  '}, status=201)['message']
expect('本文の前後空白', first['body'], 'こんにちは')
expect('メッセージイベントID', first['event_id'], eid)
expect('メッセージ投稿者', first['user'], {k: hu[k] for k in ('id', 'handle', 'name', 'avatar')})
expect('種類', first['kind'], 'text')
expect('作成時刻', isinstance(first['created_at'], int), True)
second = request('POST', path, member, {'body': 'x' * 500}, 201)['message']
expect('after は排他的', request('GET', path + f'?after={first["id"]}')['messages'], [second])
expect('新着なし', request('GET', path + f'?after={second["id"]}')['messages'], [])

# 200件制限と、カーソルを進めて残りを取得できること。
for i in range(201):
    s, _ = call('POST', path, {'body': f'ページ{i}'}, member)
    if s != 201:
        expect('ページ用投稿', s, 201)
page = request('GET', path + f'?after={second["id"]}')['messages']
expect('最大200件', len(page), 200)
expect('ID昇順', [m['id'] for m in page], sorted(m['id'] for m in page))
rest = request('GET', path + f'?after={page[-1]["id"]}')['messages']
expect('次ページ', len(rest), 1)
last = rest[0]

other = request('POST', '/events', body=payload, status=201)['event']['id']
request('POST', f'/events/{other}/messages', body={'body': '別イベント'}, status=201)
talks = request('GET', '/talks')['talks']
expect('最新メッセージ順', [t['event']['id'] for t in talks], [other, eid])
expect('イベント間で混ざらない', request('GET', path + f'?after={last["id"]}')['messages'], [])
talk = request('GET', '/talks', member)['talks'][0]
event = talk['event']
expect('イベントIDがJOINで上書きされない', event['id'], eid)
expect('主催者', event['host']['id'], hu['id'])
expect('参加者は主催者を除く', [u['id'] for u in event['members']], [mu['id']])
expect('主催者を含む人数', event['count'], 2)
expect('参加済み', event['joined'], True)
expect('参加者は主催者ではない', event['is_host'], False)
expect('公開範囲', event['group_name'], None)
expect('表示中', talk['active'], True)
expect('最終メッセージ', talk['last'], last)
expect('EventItem項目', set(event), {'id', 'title', 'place', 'time_text', 'capacity', 'capacity_min', 'duration_min', 'expires_at', 'created_at', 'group_id', 'group_name', 'host', 'members', 'count', 'joined', 'is_host'})
request('DELETE', f'/events/{eid}/join', member)
request('GET', path, member, status=403)
request('POST', path, member, {'body': '退出後'}, status=403)
expect('退出後はトークから消える', request('GET', '/talks', member)['talks'], [])
for event_id in [eid, other]:
    request('DELETE', f'/events/{event_id}')
expect('削除後はトークなし', request('GET', '/talks')['talks'], [])
print('チャット・トーク API テスト完了')
