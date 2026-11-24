-- お気に入り用テーブル追加（#166 No.3 第3塊: favorite ルート移植）
-- 方言変換は既存スパイクと同じ: SERIAL -> AUTOINCREMENT

-- 現行 favorites（api/models/favorite.ts）: id / userId / costumeId のみで timestamps: false。
-- users / costumes への外部キーは現行モデルにも無い（単なるカラム）ため、ここでも張らない。
-- (userId, costumeId) の一意制約も現行には無く、同じ衣装を重複登録できる挙動が現行仕様。
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  costumeId INTEGER NOT NULL
);

-- インデックス検討: favorite の読み取りパターンは「WHERE userId = ?」の一覧取得のみ
-- （並び替え・上限なし、全件返し）。お気に入りはユーザー数×登録数で増え続けるため、
-- 絞り込みに使う userId へインデックスを張り、一覧取得がフルスキャンにならないようにする。
-- DELETE は主キー id（+ userId は検証条件）で引くため追加インデックスは不要。
-- POST は読み取りを伴わないため、そちらも追加不要。
CREATE INDEX idx_favorites_user ON favorites (userId);
