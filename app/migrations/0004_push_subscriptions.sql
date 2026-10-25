-- #87 Web Push の届け先（端末ごと）。オフ・ログアウトで消し、送信時に 404/410 が返ったものも消す
CREATE TABLE push_subscriptions (
  endpoint TEXT NOT NULL UNIQUE,        -- プッシュサービスの URL（端末ごとに別）
  p256dh TEXT NOT NULL,                 -- 端末の公開鍵（base64url）
  auth TEXT NOT NULL,                   -- 認証用の秘密（base64url）
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id, created_at);
