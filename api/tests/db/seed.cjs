'use strict';

// Issue #117 の境界ケースを再現するシードデータ。
// 各テストの先頭でテーブルを空にしてから投入する。

// DELETE 時に物理ファイル削除が試みられるが、実在しない絶対パスのため何も起きない。
const SEED_ASSET_PATH = '/nonexistent-db-test/seed.png';

async function seedAssets(Model, tableName, rows) {
  await Model.sequelize.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
  const created = [];
  for (const row of rows) {
    created.push(
      await Model.create({
        name: row.name,
        assetPath: SEED_ASSET_PATH,
        deleted: Boolean(row.deleted),
        deletedAt: row.deleted ? new Date('2026-01-01T00:00:00.000Z') : null,
        sortOrder: row.sortOrder,
      })
    );
  }
  return created;
}

function seedFaces(Face, rows) {
  return seedAssets(Face, 'faces', rows);
}

function seedFrontHairs(FrontHair, rows) {
  return seedAssets(FrontHair, 'front_hairs', rows);
}

// 正常系: 未削除5件、sortOrder は 1..5 の連番。
function cleanLineRows(prefix = 'face') {
  return ['A', 'B', 'C', 'D', 'E'].map((suffix, index) => ({
    name: `${prefix}-${suffix}`,
    sortOrder: index + 1,
  }));
}

// 境界ケース: 論理削除済みレコードが未削除レコードの間に挟まったレガシー状態。
// 削除済みの face-C は sortOrder=3 を保持したまま残り、
// 未削除側は 1, 2, 4, 5 と歯抜けになっている（#117 発生時のデータ状態）。
function legacySandwichRows() {
  return [
    { name: 'face-A', sortOrder: 1 },
    { name: 'face-B', sortOrder: 2 },
    { name: 'face-C', sortOrder: 3, deleted: true },
    { name: 'face-D', sortOrder: 4 },
    { name: 'face-E', sortOrder: 5 },
  ];
}

module.exports = { seedFaces, seedFrontHairs, cleanLineRows, legacySandwichRows };
