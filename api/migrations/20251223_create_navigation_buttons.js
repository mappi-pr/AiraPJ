// Sequelize migration: navigation_buttons table creation
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('navigation_buttons', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      buttonType: {
        type: Sequelize.ENUM('prev', 'next'),
        allowNull: false,
        unique: true,
      },
      assetPath: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    });

    // Initialize with default null values for prev and next buttons
    await queryInterface.bulkInsert('navigation_buttons', [
      { buttonType: 'prev', assetPath: null },
      { buttonType: 'next', assetPath: null },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('navigation_buttons');
  }
};
