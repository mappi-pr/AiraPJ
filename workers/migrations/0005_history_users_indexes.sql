-- 生成履歴・ユーザー用テーブル追加と、インデックス面の懸念対応（#166 No.3 第2塊）
-- 方言変換は既存スパイクと同じ: BOOLEAN -> INTEGER, TIMESTAMP -> TEXT(ISO 8601), SERIAL -> AUTOINCREMENT

-- 現行 users: id はフロント発行の UUID 文字列が主キー、createdAt のみ（timestamps: false）
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 現行 generation_histories の移植。stickers は #168 と同じく JSON 文字列で保持する
-- （履歴行に属する値の列で、独立した検索・参照がないため関連テーブルにしない）。
-- imageUrl は現行でも単なる文字列カラムで、生成画像の実体はフロントがダウンロードする
-- （サーバ側に画像ファイルは保存されない）ため、R2 対応は不要。
CREATE TABLE generation_histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  backgroundId INTEGER,
  costumeId INTEGER,
  backHairId INTEGER,
  faceId INTEGER,
  frontHairId INTEGER,
  scale REAL NOT NULL DEFAULT 1.0,
  dragX REAL NOT NULL DEFAULT 0,
  dragY REAL NOT NULL DEFAULT 0,
  stickers TEXT,
  imageUrl TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- インデックス検討 (1): generation_histories の一覧取得は
-- 「WHERE userId = ? ORDER BY createdAt DESC LIMIT 100」が唯一の読み取りパターン。
-- 履歴はユーザーごとに増え続けるため、複合インデックス (userId, createdAt) を張り、
-- 絞り込みと並び替えをインデックスだけで処理できるようにする（実害が出る前の先行投資として妥当）。
-- DELETE は主キー id で引くため追加インデックスは不要。
-- isAvailable 判定の IN クエリはパーツ各テーブルを主キーで引くため、そちらも追加不要。
CREATE INDEX idx_generation_histories_user_created
  ON generation_histories (userId, createdAt DESC);

-- インデックス検討 (2): game_masters の認証時照合は LOWER(email) = ? （現行仕様 #148）。
-- email の UNIQUE インデックスは関数を通した照合には効かないため、LOWER(email) の
-- 表式インデックスを張って照合をインデックスで処理できるようにする。
-- 登録時は現行どおり lowercase に寄せて保存されるが、移行データに混在ケースが
-- 残っていても照合・索引の両方が効く形になる。
CREATE INDEX idx_game_masters_lower_email
  ON game_masters (LOWER(email));
