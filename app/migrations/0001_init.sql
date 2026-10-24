-- 全機能のテーブルをここで作る（追加の変更は 0002_ 以降のファイルで ADD のみ）
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handle TEXT NOT NULL UNIQUE,          -- ログインID（英数字と_）
  name TEXT NOT NULL,                   -- 表示名
  avatar TEXT,                          -- 画像の data URL（無ければ null）
  invite_code TEXT NOT NULL UNIQUE,     -- 友達追加用（招待リンク・QR）
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE login_attempts (
  key TEXT NOT NULL,                    -- 'login:<handle>' / 'register:<ip>'
  at INTEGER NOT NULL
);
CREATE INDEX idx_login_attempts ON login_attempts(key, at);
-- 友達（相互）。user_a < user_b で1行
CREATE TABLE friendships (
  user_a INTEGER NOT NULL,
  user_b INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_a, user_b)
);
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  profile TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE group_members (
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
-- 募集（イベント）。group_id が NULL なら「全体」（主催者の友達全員）に表示
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  host_id INTEGER NOT NULL,
  group_id INTEGER,
  title TEXT NOT NULL,
  place TEXT NOT NULL DEFAULT '',
  time_text TEXT NOT NULL DEFAULT '',   -- 「19:00〜」など表示用の時間
  capacity INTEGER NOT NULL,            -- 主催者を含む人数
  duration_min INTEGER NOT NULL,        -- 表示時間（分）
  expires_at INTEGER NOT NULL,          -- 表示が終わる時刻（ms）
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_events_expires ON events(expires_at);
CREATE TABLE event_members (
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (event_id, user_id)
);
-- イベント内チャット。kind = 'text' | 'system'（「〜が参加しました」）
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  user_id INTEGER,
  kind TEXT NOT NULL DEFAULT 'text',
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_messages_event ON messages(event_id, id);
