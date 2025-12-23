'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ['faces', 'front_hairs', 'back_hairs', 'costumes', 'backgrounds'];
    
    for (const table of tables) {
      await queryInterface.addColumn(table, 'offsetX', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'X offset position for image placement'
      });
      
      await queryInterface.addColumn(table, 'offsetY', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Y offset position for image placement'
      });
      
      await queryInterface.addColumn(table, 'width', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 240,
        comment: 'Actual width of the image'
      });
      
      await queryInterface.addColumn(table, 'height', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 320,
        comment: 'Actual height of the image'
      });
    }
  },

  async down(queryInterface) {
    const tables = ['faces', 'front_hairs', 'back_hairs', 'costumes', 'backgrounds'];
    
    for (const table of tables) {
      await queryInterface.removeColumn(table, 'offsetX');
      await queryInterface.removeColumn(table, 'offsetY');
      await queryInterface.removeColumn(table, 'width');
      await queryInterface.removeColumn(table, 'height');
    }
  }
};
