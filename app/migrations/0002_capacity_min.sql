-- #31 遊ぶ人数に幅を持たせる。capacity_min〜capacity（主催者を含む）。0 は「下限なし」（既存の募集）
ALTER TABLE events ADD COLUMN capacity_min INTEGER NOT NULL DEFAULT 0;
