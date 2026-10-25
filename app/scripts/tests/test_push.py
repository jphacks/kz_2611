"""#87 通知（Web Push）: 届け先の登録・解除と、通知を送る相手の選び方。
送信はしない: 鍵が無い（CI）か PUSH_TEST_OUTBOX=1 で起動した手元サーバーは、送る代わりに /push/test-outbox へ記録する"""
import base64, os, time
from lib import call, expect, new_user, make_friends, SUFFIX

# RFC 8291 の例の端末公開鍵（P-256 上の正しい点）。届け先 URL はテスト用で、実際には送らない
P256DH = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'
_n = 0
def device(name):
    global _n; _n += 1
    auth = base64.urlsafe_b64encode(os.urandom(16)).decode().rstrip('=')
    return {'endpoint': f'https://fcm.googleapis.com/fcm/send/kz-test-{SUFFIX}-{name}-{_n}', 'keys': {'p256dh': P256DH, 'auth': auth}}

def subscribe(token, sub, label):
    s, r = call('POST', '/push/subscribe', sub, token); expect(label, (s, r.get('ok')), (200, True))

host, host_u = new_user('phost')
friend, friend_u = new_user('pfriend')
member, member_u = new_user('pmember')
stranger, stranger_u = new_user('pother')
pending, pending_u = new_user('ppending')

# ---- 認証・入力チェック ----
s, _ = call('GET', '/push/key'); expect('鍵の取得はログインが必要', s, 401)
s, r = call('GET', '/push/key', token=host); expect('鍵の取得', s, 200)
expect('鍵は文字列か null', r['key'] is None or isinstance(r['key'], str), True)
s, _ = call('POST', '/push/subscribe', device('x')); expect('登録はログインが必要', s, 401)
s, _ = call('DELETE', '/push/subscribe', {'endpoint': device('x')['endpoint']}); expect('解除はログインが必要', s, 401)
good = device('check')
for label, ep in [('http', 'http://fcm.googleapis.com/fcm/send/a'), ('localhost', 'https://localhost/a'),
                  ('IP', 'https://127.0.0.1/a'), ('メタデータ', 'https://169.254.169.254/latest/meta-data'),
                  ('ポート', 'https://fcm.googleapis.com:8443/a'), ('認証情報', 'https://u:p@fcm.googleapis.com/a'),
                  ('似たホスト', 'https://fcm.googleapis.com.evil.example/a'), ('他のホスト', 'https://example.com/fcm/send/a'),
                  ('空', ''), ('数値', 1)]:
    s, _ = call('POST', '/push/subscribe', {**good, 'endpoint': ep}, host); expect(f'届け先を拒否 {label}', s, 400)
for label, keys in [('鍵なし', None), ('短い公開鍵', {'p256dh': P256DH[:-4], 'auth': good['keys']['auth']}),
                    ('曲線外', {'p256dh': 'B' + 'A' * 86, 'auth': good['keys']['auth']}),
                    ('短いauth', {'p256dh': P256DH, 'auth': 'AAAA'})]:
    s, _ = call('POST', '/push/subscribe', {'endpoint': good['endpoint'], 'keys': keys}, host); expect(f'鍵を拒否 {label}', s, 400)
subscribe(host, good, '登録'); subscribe(host, good, '同じ端末の再登録は冪等')
s, _ = call('POST', '/push/subscribe', good, stranger); expect('他人の届け先は乗っ取れない', s, 409)
s, r = call('DELETE', '/push/subscribe', {'endpoint': good['endpoint']}, stranger); expect('他人の届け先は消せない（200）', s, 200)
s, _ = call('POST', '/push/subscribe', good, stranger); expect('他人が消そうとしても残る', s, 409)
s, _ = call('DELETE', '/push/subscribe', {'endpoint': good['endpoint']}, host); expect('自分の届け先を解除', s, 200)
s, _ = call('DELETE', '/push/subscribe', {'endpoint': good['endpoint']}, host); expect('重複解除は冪等', s, 200)
subscribe(stranger, good, '解除後は他の人が登録できる')
call('DELETE', '/push/subscribe', {'endpoint': good['endpoint']}, stranger)

s, _ = call('GET', '/push/test-outbox?event_id=0', token=host)
if s == 404:
    print('skip 通知の宛先（このサーバーは実際に送信するモード。PUSH_TEST_OUTBOX=1 で起動すると確かめられる）')
    raise SystemExit(0)

def sent(eid, want, label):
    """記録された通知（user_id, kind）の集合が want になるまで待ち、少し待って増えないことも確かめる"""
    got = None
    for _ in range(40):
        s, r = call('GET', f'/push/test-outbox?event_id={eid}', token=host)
        got = sorted((n['user_id'], n['kind']) for n in r['notifications'])
        if got == sorted(want): break
        time.sleep(0.1)
    time.sleep(0.3)
    s, r = call('GET', f'/push/test-outbox?event_id={eid}', token=host)
    expect(label, sorted((n['user_id'], n['kind']) for n in r['notifications']), sorted(want))
    return r['notifications']

# ---- 宛先の選び方 ----
make_friends(friend, friend_u, host, host_u)
make_friends(member, member_u, host, host_u)
s, _ = call('POST', '/friends', {'handle': host_u['handle']}, pending); expect('承認前の申請', s, 200)
host_a, host_b = device('host-a'), device('host-b')
for token, sub, who in [(host, host_a, '主催者の端末A'), (host, host_b, '主催者の端末B'), (friend, device('friend'), '友達'),
                        (member, device('member'), 'グループのメンバー'), (stranger, device('stranger'), '他人'),
                        (pending, device('pending'), '申請中の人')]:
    subscribe(token, sub, f'登録 {who}')
s, r = call('POST', '/groups', {'name': f'通知{SUFFIX}'[:20], 'profile': '', 'member_ids': [member_u['id']]}, host)
expect('グループ作成', s, 201); gid = r['group']['id']

base = dict(place='駅前', time_text='19:00〜', duration_min=30)
s, r = call('POST', '/events', {**base, 'title': 'カラオケ', 'capacity': 3, 'group_id': None}, host); expect('全体の募集', s, 201)
eid = r['event']['id']
notes = sent(eid, [(friend_u['id'], 'created'), (member_u['id'], 'created')], '全体の募集は友達だけに届く（主催者・他人・申請中は除く）')
expect('本文に名前とタイトル', all(host_u['name'] in n['body'] and 'カラオケ' in n['body'] for n in notes), True)
expect('募集のid', {n['event_id'] for n in notes}, {eid})

s, r = call('POST', '/events', {**base, 'title': 'ご飯', 'capacity': 3, 'group_id': gid}, host); expect('グループの募集', s, 201)
sent(r['event']['id'], [(member_u['id'], 'created')], 'グループの募集はメンバーだけに届く（グループ外の友達は除く）')

s, r = call('POST', '/events', {**base, 'title': 'ボウリング', 'capacity': 3, 'group_id': None}, friend); expect('友達の募集', s, 201)
sent(r['event']['id'], [(host_u['id'], 'created'), (host_u['id'], 'created')], '主催者の友達へ。端末ごとに届き、自分には届かない')

# 参加: 主催者へ。参加した本人には届かない
s, _ = call('POST', f'/events/{eid}/join', token=friend); expect('参加', s, 200)
sent(eid, [(friend_u['id'], 'created'), (member_u['id'], 'created'), (host_u['id'], 'joined'), (host_u['id'], 'joined')], '参加は主催者の全端末へ')
s, _ = call('POST', f'/events/{eid}/join', token=friend); expect('参加済みの再送', s, 200)
sent(eid, [(friend_u['id'], 'created'), (member_u['id'], 'created'), (host_u['id'], 'joined'), (host_u['id'], 'joined')], '参加済みの再送では通知しない')
# この端末（B）だけ解除すると、他の端末（A）には届き続ける（ログアウトと同じ処理）
s, _ = call('DELETE', '/push/subscribe', {'endpoint': host_b['endpoint']}, host); expect('端末Bを解除', s, 200)
# 満員で終了: 主催者と参加者へ。最後に参加した本人には届かない（主催者には「参加」でなく「終了」を1通）
s, r = call('POST', f'/events/{eid}/join', token=member); expect('最後の1人が参加', s, 200)
expect('満員で終了', r['event']['count'], 3)
notes = sent(eid, [(friend_u['id'], 'created'), (member_u['id'], 'created'), (host_u['id'], 'joined'), (host_u['id'], 'joined'),
                   (host_u['id'], 'full'), (friend_u['id'], 'full')], '満員終了は主催者と参加者へ（本人・解除した端末は除く）')
full = [n for n in notes if n['kind'] == 'full']
expect('解除した端末には届かない', host_b['endpoint'] in [n['endpoint'] for n in full], False)
expect('終了の本文に名前とタイトル', all(member_u['name'] in n['body'] and 'カラオケ' in n['body'] for n in full), True)
s, _ = call('POST', f'/events/{eid}/join', token=stranger); expect('見えない募集には参加できない', s, 404)

# 2人で満員（主催者＋1人）: 主催者だけに「終了」
s, r = call('POST', '/events', {**base, 'title': '散歩', 'capacity': 2, 'group_id': None}, host); expect('2人の募集', s, 201)
pair = r['event']['id']
s, _ = call('POST', f'/events/{pair}/join', token=member); expect('2人目が参加', s, 200)
sent(pair, [(friend_u['id'], 'created'), (member_u['id'], 'created'), (host_u['id'], 'full')], '2人で満員なら主催者へ終了だけ')

# 端末の上限: 古いものから消える（11台目で1台目が消える）
extra, extra_u = new_user('pdevice')
first = device('first'); subscribe(extra, first, '1台目')
for i in range(10): subscribe(extra, device(f'more{i}'), f'{i + 2}台目')
subscribe(stranger, first, '上限を超えて消えた届け先は他の人が登録できる')

# 45件などの暗黙の件数制限で、見られる人の通知が欠落しない
bulk_host, bulk_u = new_user('pbulkhost')
want = []
for i in range(5):
    token, user = new_user(f'pbulk{i}')
    make_friends(token, user, bulk_host, bulk_u)
    for j in range(10):
        subscribe(token, device(f'bulk{i}-{j}'), f'一括通知の端末 {i}-{j}')
        want.append((user['id'], 'created'))
s, r = call('POST', '/events', {**base, 'title': '全員への通知', 'capacity': 3, 'group_id': None}, bulk_host)
expect('一括通知の募集', s, 201)
sent(r['event']['id'], want, '50件の対象を黙って切り捨てない')
