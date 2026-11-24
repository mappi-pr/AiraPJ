DELETE FROM backgrounds;
DELETE FROM game_masters;
INSERT INTO game_masters (email, name, created_by) VALUES ('gm@example.com', 'GM', 'spike');
INSERT INTO backgrounds (name, assetPath, deleted, deletedAt, sortOrder, offsetX, offsetY, width, height) VALUES
  ('bg-a', '/uploads/bg/a.png', 0, NULL, 1, 0, 0, 240, 320),
  ('bg-b', '/uploads/bg/b.png', 0, NULL, 2, 10, 20, 300, 400),
  ('bg-c', '/uploads/bg/c.png', 0, NULL, 3, 0, 0, 240, 320),
  ('bg-gone', '/uploads/bg/gone.png', 1, '2026-01-01T00:00:00.000Z', 0, 0, 0, 240, 320);
