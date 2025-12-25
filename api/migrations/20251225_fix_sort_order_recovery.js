// Sequelize migration: sortOrder復旧用マイグレーション
// 本番環境で既にsortOrderが追加されているが、値が正しく設定されていない場合の復旧用
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 各テーブルの非削除アイテムにsortOrderを再設定
    // idの昇順で1から連番を振る
    // Window関数を使用して効率的に更新
    
    // faces
    await queryInterface.sequelize.query(`
      UPDATE faces
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as row_num
        FROM faces
        WHERE deleted = false
      ) AS subquery
      WHERE faces.id = subquery.id
    `);

    // front_hairs
    await queryInterface.sequelize.query(`
      UPDATE front_hairs
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as row_num
        FROM front_hairs
        WHERE deleted = false
      ) AS subquery
      WHERE front_hairs.id = subquery.id
    `);

    // back_hairs
    await queryInterface.sequelize.query(`
      UPDATE back_hairs
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as row_num
        FROM back_hairs
        WHERE deleted = false
      ) AS subquery
      WHERE back_hairs.id = subquery.id
    `);

    // backgrounds
    await queryInterface.sequelize.query(`
      UPDATE backgrounds
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as row_num
        FROM backgrounds
        WHERE deleted = false
      ) AS subquery
      WHERE backgrounds.id = subquery.id
    `);

    // costumes
    await queryInterface.sequelize.query(`
      UPDATE costumes
      SET "sortOrder" = subquery.row_num
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as row_num
        FROM costumes
        WHERE deleted = false
      ) AS subquery
      WHERE costumes.id = subquery.id
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
