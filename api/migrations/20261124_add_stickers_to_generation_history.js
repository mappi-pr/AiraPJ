// Sequelize migration: 生成履歴にステッカー配置カラム追加（Issue #165）
// 配置（ステッカーID・位置・重なり順）は履歴行に属する値の列であり、
// 独立して検索・参照されることがないため、関連テーブルではなく
// JSON カラムに配列で保持する。
// 既存の履歴は NULL のままで、従来どおり表示できる（後方互換）。
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('generation_histories', 'stickers', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('generation_histories', 'stickers');
  }
};
