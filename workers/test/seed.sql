DELETE FROM backgrounds;
DELETE FROM game_masters;
DELETE FROM generation_histories;
DELETE FROM favorites;
DELETE FROM users;
DELETE FROM faces;
DELETE FROM front_hairs;
DELETE FROM back_hairs;
DELETE FROM costumes;
DELETE FROM stickers;
DELETE FROM navigation_buttons;
INSERT INTO game_masters (email, name, created_by) VALUES ('gm@example.com', 'GM', 'spike');
INSERT INTO backgrounds (name, assetPath, deleted, deletedAt, sortOrder, offsetX, offsetY, width, height) VALUES
  ('bg-a', '/uploads/background/a.png', 0, NULL, 1, 0, 0, 240, 320),
  ('bg-b', '/uploads/background/b.png', 0, NULL, 2, 10, 20, 300, 400),
  ('bg-c', '/uploads/background/c.png', 0, NULL, 3, 0, 0, 240, 320),
  ('bg-gone', '/uploads/background/gone.png', 1, '2026-01-01T00:00:00.000Z', 0, 0, 0, 240, 320);
INSERT INTO faces (name, assetPath, deleted, deletedAt, sortOrder, offsetX, offsetY, width, height) VALUES
  ('face-a', '/uploads/face/a.png', 0, NULL, 1, 0, 0, 240, 320),
  ('face-b', '/uploads/face/b.png', 0, NULL, 2, 10, 20, 300, 400),
  ('face-gone', '/uploads/face/gone.png', 1, '2026-01-01T00:00:00.000Z', 0, 0, 0, 240, 320);
INSERT INTO front_hairs (name, assetPath, deleted, deletedAt, sortOrder, offsetX, offsetY, width, height) VALUES
  ('front-a', '/uploads/frontHair/a.png', 0, NULL, 1, 0, 0, 240, 320),
  ('front-b', '/uploads/frontHair/b.png', 0, NULL, 2, 10, 20, 300, 400),
  ('front-gone', '/uploads/frontHair/gone.png', 1, '2026-01-01T00:00:00.000Z', 0, 0, 0, 240, 320);
INSERT INTO back_hairs (name, assetPath, deleted, deletedAt, sortOrder, offsetX, offsetY, width, height) VALUES
  ('back-a', '/uploads/backHair/a.png', 0, NULL, 1, 0, 0, 240, 320),
  ('back-b', '/uploads/backHair/b.png', 0, NULL, 2, 10, 20, 300, 400),
  ('back-gone', '/uploads/backHair/gone.png', 1, '2026-01-01T00:00:00.000Z', 0, 0, 0, 240, 320);
INSERT INTO costumes (name, assetPath, deleted, deletedAt, sortOrder, offsetX, offsetY, width, height) VALUES
  ('costume-a', '/uploads/costume/a.png', 0, NULL, 1, 0, 0, 240, 320),
  ('costume-b', '/uploads/costume/b.png', 0, NULL, 2, 10, 20, 300, 400),
  ('costume-gone', '/uploads/costume/gone.png', 1, '2026-01-01T00:00:00.000Z', 0, 0, 0, 240, 320);
INSERT INTO stickers (name, assetPath, deleted, deletedAt, sortOrder, offsetX, offsetY, width, height) VALUES
  ('sticker-a', '/uploads/sticker/a.png', 0, NULL, 1, 0, 0, 240, 320),
  ('sticker-b', '/uploads/sticker/b.png', 0, NULL, 2, 10, 20, 300, 400),
  ('sticker-gone', '/uploads/sticker/gone.png', 1, '2026-01-01T00:00:00.000Z', 0, 0, 0, 240, 320);
INSERT INTO navigation_buttons (buttonType, assetPath) VALUES
  ('prev', NULL),
  ('next', NULL);
-- 生成履歴の一覧上限（最新100件）確認用に、limit-user へ105件を投入する
INSERT INTO generation_histories (userId, createdAt)
WITH RECURSIVE cnt(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM cnt WHERE i < 104)
SELECT 'limit-user', '2026-01-01T00:00:00.' || printf('%03d', i) || 'Z' FROM cnt;
