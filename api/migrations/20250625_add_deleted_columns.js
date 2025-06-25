// Sequelize migration: 論理削除カラム追加
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('faces', 'deleted', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('faces', 'deletedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('front_hairs', 'deleted', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('front_hairs', 'deletedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('back_hairs', 'deleted', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('back_hairs', 'deletedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('backgrounds', 'deleted', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('backgrounds', 'deletedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('costumes', 'deleted', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('costumes', 'deletedAt', { type: Sequelize.DATE, allowNull: true });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('faces', 'deleted');
    await queryInterface.removeColumn('faces', 'deletedAt');
    await queryInterface.removeColumn('front_hairs', 'deleted');
    await queryInterface.removeColumn('front_hairs', 'deletedAt');
    await queryInterface.removeColumn('back_hairs', 'deleted');
    await queryInterface.removeColumn('back_hairs', 'deletedAt');
    await queryInterface.removeColumn('backgrounds', 'deleted');
    await queryInterface.removeColumn('backgrounds', 'deletedAt');
    await queryInterface.removeColumn('costumes', 'deleted');
    await queryInterface.removeColumn('costumes', 'deletedAt');
  }
};
