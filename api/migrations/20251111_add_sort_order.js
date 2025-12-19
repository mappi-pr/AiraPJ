// Sequelize migration: sortOrderカラム追加
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 各テーブルにsortOrderカラムを追加
    await queryInterface.addColumn('faces', 'sortOrder', { 
      type: Sequelize.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
    });
    await queryInterface.addColumn('front_hairs', 'sortOrder', { 
      type: Sequelize.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
    });
    await queryInterface.addColumn('back_hairs', 'sortOrder', { 
      type: Sequelize.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
    });
    await queryInterface.addColumn('backgrounds', 'sortOrder', { 
      type: Sequelize.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
    });
    await queryInterface.addColumn('costumes', 'sortOrder', { 
      type: Sequelize.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
    });

    // 既存データにIDベースのsortOrderを設定
    await queryInterface.sequelize.query(`
      UPDATE faces SET "sortOrder" = id WHERE "sortOrder" = 0;
    `);
    await queryInterface.sequelize.query(`
      UPDATE front_hairs SET "sortOrder" = id WHERE "sortOrder" = 0;
    `);
    await queryInterface.sequelize.query(`
      UPDATE back_hairs SET "sortOrder" = id WHERE "sortOrder" = 0;
    `);
    await queryInterface.sequelize.query(`
      UPDATE backgrounds SET "sortOrder" = id WHERE "sortOrder" = 0;
    `);
    await queryInterface.sequelize.query(`
      UPDATE costumes SET "sortOrder" = id WHERE "sortOrder" = 0;
    `);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('faces', 'sortOrder');
    await queryInterface.removeColumn('front_hairs', 'sortOrder');
    await queryInterface.removeColumn('back_hairs', 'sortOrder');
    await queryInterface.removeColumn('backgrounds', 'sortOrder');
    await queryInterface.removeColumn('costumes', 'sortOrder');
  }
};
