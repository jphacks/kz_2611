"""同じイベントの参加者だけにプロフィールを公開する。"""
from lib import call, expect, new_user, make_friends


def request(method, path, token=None, body=None, status=200):
    s, result = call(method, path, body, token)
    expect(f'{method} {path}', s, status)
    return result


a, alice = new_user('fofA')
b, bob = new_user('fofB')
c, carol = new_user('fofC')
d, outsider = new_user('fofD')
for token, user in ((b, bob), (c, carol), (d, outsider)):
    make_friends(a, alice, token, user)
event = request('POST', '/events', a, {'title': '友達の友達', 'place': '', 'time_text': '', 'capacity': 4, 'duration_min': 60, 'group_id': None}, 201)['event']
path = f"/events/{event['id']}"
request('POST', path + '/join', b)
request('GET', f"/users/{carol['id']}", b, status=404)
request('POST', path + '/join', c)
profile = request('GET', f"/users/{carol['id']}", b)
expect('参加者どうし・未友達', profile['is_friend'], False)
expect('公開情報のみ', set(profile['user']), {'id', 'handle', 'name', 'avatar'})
expect('対象ユーザー', profile['user']['id'], carol['id'])
request('GET', f"/users/{bob['id']}", c)
request('GET', f"/users/{carol['id']}", d, status=404)
request('GET', f"/users/{outsider['id']}", b, status=404)
request('DELETE', f"/friends/{bob['id']}", a)
request('GET', f"/users/{alice['id']}", b)
request('GET', f"/users/{bob['id']}", a)
request('DELETE', path + '/join', c)
request('GET', f"/users/{carol['id']}", b, status=404)
request('POST', path + '/join', c)
expect('申請前', request('GET', f"/users/{carol['id']}", b)['request'], 'none')
for _ in range(2):
    expect('参加者への申請は冪等', request('POST', '/friends', b, {'handle': carol['handle']}), {'status': 'requested'})
expect('申請中', request('GET', f"/users/{carol['id']}", b), {'user': profile['user'], 'is_friend': False, 'request': 'sent'})
expect('申請が届いている', request('GET', f"/users/{bob['id']}", c)['request'], 'received')
request('POST', f"/friend-requests/{bob['id']}/accept", c)
expect('承認後は申請なし', request('GET', f"/users/{carol['id']}", b)['request'], 'none')
expect('追加後は友達', request('GET', f"/users/{carol['id']}", b)['is_friend'], True)
expect('相互追加', request('GET', f"/users/{bob['id']}", c)['is_friend'], True)
request('DELETE', f"/friends/{carol['id']}", b)
request('DELETE', path, a)
request('GET', f"/users/{carol['id']}", b, status=404)
request('GET', f"/users/{bob['id']}", a, status=404)
expect('本人は閲覧可能', request('GET', f"/users/{bob['id']}", b)['is_friend'], False)
request('GET', f"/users/{bob['id']}", status=401)
request('GET', '/users/99999999', b, status=404)
