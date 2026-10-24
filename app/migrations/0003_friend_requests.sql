-- #77 IDでの友達追加は申請にする。相手が承認すると friendships に1行入り、申請は消える
CREATE TABLE friend_requests (
  from_id INTEGER NOT NULL,             -- 申請した人
  to_id INTEGER NOT NULL,               -- 申請された人
  created_at INTEGER NOT NULL,
  PRIMARY KEY (from_id, to_id)
);
CREATE INDEX idx_friend_requests_to ON friend_requests(to_id, created_at);
