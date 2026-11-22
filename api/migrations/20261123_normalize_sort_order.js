// Sequelize migration: sortOrder正規化マイグレーション
// Issue #117 対応。削除済みレコードが保持するsortOrderによる「歯抜け」と、
// 重複したsortOrderを解消するため、未削除アイテムに現在の表示順のまま連番を振り直す。
// 20251225_fix_sort_order_recovery.js との違い:
//   - あちらは id 順に振り直すため、ユーザーが設定した並び順が失われる
//   - こちらは現在の sortOrder 順（同値は id 順）を保持したまま 1..N に正規化する
// あわせて、削除済みアイテムのsortOrderは値域外の 0 にリセットする
// （削除時に詰め直しを行うようになったルート実装と揃える）。
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // faces
    await queryInterface.sequelize.query(`
      UPDATE faces
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "sortOrder" ASC, id ASC) as row_num
        FROM faces
        WHERE deleted = false
      ) AS subquery
      WHERE faces.id = subquery.id
    `);
    await queryInterface.sequelize.query(`
      UPDATE faces SET "sortOrder" = 0 WHERE deleted = true
    `);

    // front_hairs
    await queryInterface.sequelize.query(`
      UPDATE front_hairs
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "sortOrder" ASC, id ASC) as row_num
        FROM front_hairs
        WHERE deleted = false
      ) AS subquery
      WHERE front_hairs.id = subquery.id
    `);
    await queryInterface.sequelize.query(`
      UPDATE front_hairs SET "sortOrder" = 0 WHERE deleted = true
    `);

    // back_hairs
    await queryInterface.sequelize.query(`
      UPDATE back_hairs
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "sortOrder" ASC, id ASC) as row_num
        FROM back_hairs
        WHERE deleted = false
      ) AS subquery
      WHERE back_hairs.id = subquery.id
    `);
    await queryInterface.sequelize.query(`
      UPDATE back_hairs SET "sortOrder" = 0 WHERE deleted = true
    `);

    // backgrounds
    await queryInterface.sequelize.query(`
      UPDATE backgrounds
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "sortOrder" ASC, id ASC) as row_num
        FROM backgrounds
        WHERE deleted = false
      ) AS subquery
      WHERE backgrounds.id = subquery.id
    `);
    await queryInterface.sequelize.query(`
      UPDATE backgrounds SET "sortOrder" = 0 WHERE deleted = true
    `);

    // costumes
    await queryInterface.sequelize.query(`
      UPDATE costumes
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "sortOrder" ASC, id ASC) as row_num
        FROM costumes
        WHERE deleted = false
      ) AS subquery
      WHERE costumes.id = subquery.id
    `);
    await queryInterface.sequelize.query(`
      UPDATE costumes SET "sortOrder" = 0 WHERE deleted = true
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // 注意: このロールバックは元の値を完全には復元しません
    // sortOrderを0にリセットしますが、元のカスタム順序は失われます
    // 本番環境でのロールバックは慎重に行ってください
    await queryInterface.sequelize.query(`UPDATE faces SET "sortOrder" = 0`);
    await queryInterface.sequelize.query(`UPDATE front_hairs SET "sortOrder" = 0`);
    await queryInterface.sequelize.query(`UPDATE back_hairs SET "sortOrder" = 0`);
    await queryInterface.sequelize.query(`UPDATE backgrounds SET "sortOrder" = 0`);
    await queryInterface.sequelize.query(`UPDATE costumes SET "sortOrder" = 0`);
  }
};
