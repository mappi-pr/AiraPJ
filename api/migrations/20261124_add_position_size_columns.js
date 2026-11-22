// Sequelize migration: 位置・サイズ用カラム追加（Issue #78）
// 各パーツに offsetX / offsetY / width / height を追加し、
// 余白なし画像でも合成位置を合わせられるようにする。
// 既存データはデフォルト値（オフセット 0,0 / サイズ 240x320）により従来表示と同一になる。
'use strict';

const TABLES = ['faces', 'front_hairs', 'back_hairs', 'backgrounds', 'costumes'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of TABLES) {
      await queryInterface.addColumn(table, 'offsetX', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
      await queryInterface.addColumn(table, 'offsetY', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
      await queryInterface.addColumn(table, 'width', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 240
      });
      await queryInterface.addColumn(table, 'height', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 320
      });
    }
  },
  down: async (queryInterface) => {
    for (const table of TABLES) {
      await queryInterface.removeColumn(table, 'offsetX');
      await queryInterface.removeColumn(table, 'offsetY');
      await queryInterface.removeColumn(table, 'width');
      await queryInterface.removeColumn(table, 'height');
    }
  }
};
