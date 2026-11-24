-- リハーサル用: 現行 api のスキーマ（Sequelize モデル準拠）＋本番相当のサンプルデータ
-- 狙いのケース:
--   * assetPath の旧ディレクトリ名（bg/csm/nav）と正式名称の混在
--   * 有効行の sortOrder 重複（backgrounds / costumes）と、削除済み行の sortOrder=0 重複（正常）
--   * 削除済み行（deletedAt あり）
--   * GM の大小文字混在メール
--   * 履歴の stickers JSON（あり／なし）
--   * タイムゾーンオフセット付き createdAt（+09 から UTC への換算確認）

CREATE TABLE backgrounds (
  id SERIAL PRIMARY KEY, name varchar(255) NOT NULL, "assetPath" varchar(255) NOT NULL,
  deleted boolean NOT NULL DEFAULT false, "deletedAt" timestamptz NULL,
  "sortOrder" integer NOT NULL DEFAULT 0, "offsetX" integer NOT NULL DEFAULT 0,
  "offsetY" integer NOT NULL DEFAULT 0, width integer NOT NULL DEFAULT 240, height integer NOT NULL DEFAULT 320
);
CREATE TABLE faces (
  id SERIAL PRIMARY KEY, name varchar(255) NOT NULL, "assetPath" varchar(255) NOT NULL,
  deleted boolean NOT NULL DEFAULT false, "deletedAt" timestamptz NULL,
  "sortOrder" integer NOT NULL DEFAULT 0, "offsetX" integer NOT NULL DEFAULT 0,
  "offsetY" integer NOT NULL DEFAULT 0, width integer NOT NULL DEFAULT 240, height integer NOT NULL DEFAULT 320
);
CREATE TABLE front_hairs (
  id SERIAL PRIMARY KEY, name varchar(255) NOT NULL, "assetPath" varchar(255) NOT NULL,
  deleted boolean NOT NULL DEFAULT false, "deletedAt" timestamptz NULL,
  "sortOrder" integer NOT NULL DEFAULT 0, "offsetX" integer NOT NULL DEFAULT 0,
  "offsetY" integer NOT NULL DEFAULT 0, width integer NOT NULL DEFAULT 240, height integer NOT NULL DEFAULT 320
);
CREATE TABLE back_hairs (
  id SERIAL PRIMARY KEY, name varchar(255) NOT NULL, "assetPath" varchar(255) NOT NULL,
  deleted boolean NOT NULL DEFAULT false, "deletedAt" timestamptz NULL,
  "sortOrder" integer NOT NULL DEFAULT 0, "offsetX" integer NOT NULL DEFAULT 0,
  "offsetY" integer NOT NULL DEFAULT 0, width integer NOT NULL DEFAULT 240, height integer NOT NULL DEFAULT 320
);
CREATE TABLE costumes (
  id SERIAL PRIMARY KEY, name varchar(255) NOT NULL, "assetPath" varchar(255) NOT NULL,
  deleted boolean NOT NULL DEFAULT false, "deletedAt" timestamptz NULL,
  "sortOrder" integer NOT NULL DEFAULT 0, "offsetX" integer NOT NULL DEFAULT 0,
  "offsetY" integer NOT NULL DEFAULT 0, width integer NOT NULL DEFAULT 240, height integer NOT NULL DEFAULT 320
);
CREATE TABLE stickers (
  id SERIAL PRIMARY KEY, name varchar(255) NOT NULL, "assetPath" varchar(255) NOT NULL,
  deleted boolean NOT NULL DEFAULT false, "deletedAt" timestamptz NULL,
  "sortOrder" integer NOT NULL DEFAULT 0, "offsetX" integer NOT NULL DEFAULT 0,
  "offsetY" integer NOT NULL DEFAULT 0, width integer NOT NULL DEFAULT 240, height integer NOT NULL DEFAULT 320
);
CREATE TABLE navigation_buttons (
  id SERIAL PRIMARY KEY, "buttonType" varchar(255) NOT NULL UNIQUE, "assetPath" varchar(255) NULL
);
CREATE TABLE game_masters (
  id SERIAL PRIMARY KEY, email varchar(255) NOT NULL UNIQUE, name varchar(255) NULL,
  created_at timestamptz NOT NULL DEFAULT now(), created_by varchar(255) NULL
);
CREATE TABLE users (
  id varchar(255) PRIMARY KEY, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE generation_histories (
  id SERIAL PRIMARY KEY, "userId" varchar(255) NOT NULL,
  "backgroundId" integer NULL, "costumeId" integer NULL, "backHairId" integer NULL,
  "faceId" integer NULL, "frontHairId" integer NULL,
  scale double precision NOT NULL DEFAULT 1.0, "dragX" double precision NOT NULL DEFAULT 0,
  "dragY" double precision NOT NULL DEFAULT 0,
  stickers jsonb NULL, "imageUrl" varchar(255) NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY, "userId" varchar(255) NOT NULL, "costumeId" integer NOT NULL
);

-- backgrounds: 有効行 sortOrder=2 が重複（id2, id3）。削除済み行は sortOrder=0 で重複（正常）
INSERT INTO backgrounds (id, name, "assetPath", deleted, "deletedAt", "sortOrder") VALUES
  (1, 'bg-morning', '/uploads/bg/1700000000001-aaaa.png', false, NULL, 1),
  (2, 'bg-noon',    '/uploads/background/1700000000002-bbbb.png', false, NULL, 2),
  (3, 'bg-night',   '/uploads/bg/1700000000003-cccc.png', false, NULL, 2),
  (4, 'bg-old',     '/uploads/bg/1700000000004-dddd.png', true, '2026-11-01 12:00:00+09', 0),
  (5, 'bg-older',   '/uploads/background/1700000000005-eeee.png', true, '2026-11-02 12:00:00+09', 0);
SELECT setval('backgrounds_id_seq', 5);

-- costumes: 有効行 sortOrder=1 が重複（id1, id2）
INSERT INTO costumes (id, name, "assetPath", deleted, "deletedAt", "sortOrder") VALUES
  (1, 'costume-school', '/uploads/csm/1700000000011-aaaa.png', false, NULL, 1),
  (2, 'costume-maid',   '/uploads/csm/1700000000012-bbbb.png', false, NULL, 1),
  (3, 'costume-casual', '/uploads/costume/1700000000013-cccc.png', false, NULL, 3);
SELECT setval('costumes_id_seq', 3);

-- faces: 重複なし。sortOrder に歯抜け（5）がある -> 振り直し対象でないことの確認用
INSERT INTO faces (id, name, "assetPath", deleted, "deletedAt", "sortOrder") VALUES
  (1, 'face-smile', '/uploads/face/1700000000021-aaaa.png', false, NULL, 5);
SELECT setval('faces_id_seq', 1);

INSERT INTO front_hairs (id, name, "assetPath", deleted, "deletedAt", "sortOrder") VALUES
  (1, 'fh-straight', '/uploads/frontHair/1700000000031-aaaa.png', false, NULL, 1);
SELECT setval('front_hairs_id_seq', 1);

INSERT INTO back_hairs (id, name, "assetPath", deleted, "deletedAt", "sortOrder") VALUES
  (1, 'bh-long', '/uploads/backHair/1700000000041-aaaa.png', false, NULL, 1);
SELECT setval('back_hairs_id_seq', 1);

INSERT INTO stickers (id, name, "assetPath", deleted, "deletedAt", "sortOrder") VALUES
  (1, 'sticker-star', '/uploads/sticker/1700000000051-aaaa.png', false, NULL, 1),
  (2, 'sticker-heart', '/uploads/sticker/1700000000052-bbbb.png', true, '2026-11-10 09:30:00+09', 0);
SELECT setval('stickers_id_seq', 2);

-- navigation_buttons: prev は旧名 nav、next は未設定（NULL）
INSERT INTO navigation_buttons (id, "buttonType", "assetPath") VALUES
  (1, 'prev', '/uploads/nav/prev-button.png'),
  (2, 'next', NULL);
SELECT setval('navigation_buttons_id_seq', 2);

-- game_masters: 大小文字混在メール
INSERT INTO game_masters (id, email, name, created_at, created_by) VALUES
  (1, 'Admin@Example.com', '管理者', '2025-12-22 10:00:00+09', 'system'),
  (2, 'gm@example.com', NULL, '2025-12-23 10:00:00+09', 'Admin@Example.com');
SELECT setval('game_masters_id_seq', 2);

INSERT INTO users (id, "createdAt") VALUES
  ('11111111-2222-3333-4444-555555555555', '2026-01-01 00:00:00+09'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '2026-01-02 00:00:00+09');

-- generation_histories: stickers JSON あり（id1）／なし（id2）。createdAt は +09 オフセット
INSERT INTO generation_histories
  (id, "userId", "backgroundId", "costumeId", "backHairId", "faceId", "frontHairId", scale, "dragX", "dragY", stickers, "imageUrl", "createdAt") VALUES
  (1, '11111111-2222-3333-4444-555555555555', 1, 1, 1, 1, 1, 1.5, 10, -5,
   '[{"stickerId": 1, "x": 10, "y": 190}, {"stickerId": 1, "x": 60, "y": 140}]', NULL, '2026-11-20 10:00:00+09'),
  (2, '11111111-2222-3333-4444-555555555555', 2, 3, NULL, 1, NULL, 1.0, 0, 0,
   NULL, 'https://example.com/generated/2.png', '2026-11-21 22:15:30.5+09');
SELECT setval('generation_histories_id_seq', 2);

INSERT INTO favorites (id, "userId", "costumeId") VALUES
  (1, '11111111-2222-3333-4444-555555555555', 1),
  (2, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 3);
SELECT setval('favorites_id_seq', 2);
