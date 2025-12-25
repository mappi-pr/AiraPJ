// Sequelize migration: sortOrder復旧用マイグレーション
// 本番環境で既にsortOrderが追加されているが、値が正しく設定されていない場合の復旧用
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 各テーブルの非削除アイテムにsortOrderを再設定
    // idの昇順で1から連番を振る
    
    // faces
    const faces = await queryInterface.sequelize.query(
      `SELECT id FROM faces WHERE deleted = false ORDER BY id ASC`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (let i = 0; i < faces.length; i++) {
      await queryInterface.sequelize.query(
        `UPDATE faces SET "sortOrder" = :sortOrder WHERE id = :id`,
        { replacements: { sortOrder: i + 1, id: faces[i].id } }
      );
    }

    // front_hairs
    const frontHairs = await queryInterface.sequelize.query(
      `SELECT id FROM front_hairs WHERE deleted = false ORDER BY id ASC`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (let i = 0; i < frontHairs.length; i++) {
      await queryInterface.sequelize.query(
        `UPDATE front_hairs SET "sortOrder" = :sortOrder WHERE id = :id`,
        { replacements: { sortOrder: i + 1, id: frontHairs[i].id } }
      );
    }

    // back_hairs
    const backHairs = await queryInterface.sequelize.query(
      `SELECT id FROM back_hairs WHERE deleted = false ORDER BY id ASC`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (let i = 0; i < backHairs.length; i++) {
      await queryInterface.sequelize.query(
        `UPDATE back_hairs SET "sortOrder" = :sortOrder WHERE id = :id`,
        { replacements: { sortOrder: i + 1, id: backHairs[i].id } }
      );
    }

    // backgrounds
    const backgrounds = await queryInterface.sequelize.query(
      `SELECT id FROM backgrounds WHERE deleted = false ORDER BY id ASC`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (let i = 0; i < backgrounds.length; i++) {
      await queryInterface.sequelize.query(
        `UPDATE backgrounds SET "sortOrder" = :sortOrder WHERE id = :id`,
        { replacements: { sortOrder: i + 1, id: backgrounds[i].id } }
      );
    }

    // costumes
    const costumes = await queryInterface.sequelize.query(
      `SELECT id FROM costumes WHERE deleted = false ORDER BY id ASC`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (let i = 0; i < costumes.length; i++) {
      await queryInterface.sequelize.query(
        `UPDATE costumes SET "sortOrder" = :sortOrder WHERE id = :id`,
        { replacements: { sortOrder: i + 1, id: costumes[i].id } }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    // ロールバック時はsortOrderを0にリセット
    await queryInterface.sequelize.query(`UPDATE faces SET "sortOrder" = 0`);
    await queryInterface.sequelize.query(`UPDATE front_hairs SET "sortOrder" = 0`);
    await queryInterface.sequelize.query(`UPDATE back_hairs SET "sortOrder" = 0`);
    await queryInterface.sequelize.query(`UPDATE backgrounds SET "sortOrder" = 0`);
    await queryInterface.sequelize.query(`UPDATE costumes SET "sortOrder" = 0`);
  }
};
