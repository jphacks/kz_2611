-- トーク一覧（#136）: 利用者を起点に候補のイベントIDを引くための索引。
-- events はこれまで expires_at の索引しか無く、host_id の検索が全走査になっていた。
CREATE INDEX idx_events_host ON events(host_id);
-- 参加イベントを user_id から引く（主キーは event_id, user_id の逆向き）。
CREATE INDEX idx_event_members_user ON event_members(user_id, event_id);
