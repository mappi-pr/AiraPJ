-- sortOrder 採番の同時実行競合対策をパーツ系5種別にも適用（0002 の backgrounds と同じ方式）。
-- 有効行（deleted = 0）の sortOrder だけを対象にする部分一意インデックス。
-- 列全体の UNIQUE にしない理由は 0002 と同じ（削除済み行は sortOrder = 0 に揃うため衝突する）。
-- 注意: 既存データに有効行の sortOrder 重複があるとインデックス作成は失敗する。
--   本実装のデータ移行時は、移行前に重複を解消してから流すこと。
CREATE UNIQUE INDEX idx_faces_sort_order_active
  ON faces (sortOrder)
  WHERE deleted = 0;

CREATE UNIQUE INDEX idx_front_hairs_sort_order_active
  ON front_hairs (sortOrder)
  WHERE deleted = 0;

CREATE UNIQUE INDEX idx_back_hairs_sort_order_active
  ON back_hairs (sortOrder)
  WHERE deleted = 0;

CREATE UNIQUE INDEX idx_costumes_sort_order_active
  ON costumes (sortOrder)
  WHERE deleted = 0;

CREATE UNIQUE INDEX idx_stickers_sort_order_active
  ON stickers (sortOrder)
  WHERE deleted = 0;
