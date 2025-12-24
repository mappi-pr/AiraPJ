'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create generation_histories table
    await queryInterface.createTable('generation_histories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      backgroundId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      costumeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      backHairId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      faceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      frontHairId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      scale: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1.0,
      },
      dragX: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      dragY: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add index on userId for faster queries
    await queryInterface.addIndex('generation_histories', ['userId'], {
      name: 'generation_histories_userId_idx',
    });

    // Add index on createdAt for sorting
    await queryInterface.addIndex('generation_histories', ['createdAt'], {
      name: 'generation_histories_createdAt_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop generation_histories table first (has foreign key to users)
    await queryInterface.dropTable('generation_histories');
    // Drop users table
    await queryInterface.dropTable('users');
  },
};
