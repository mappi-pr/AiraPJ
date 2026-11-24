// Sequelize migration: stickers table creation (Issue #9)
// Photoモードで最前面レイヤーに重ねるステッカー用テーブル。
// 他のアセット（faces 等）と同一のカラム構成にする。
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stickers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      assetPath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      offsetX: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      offsetY: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 240,
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 320,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('stickers');
  }
};
