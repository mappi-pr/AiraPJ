import { Model, DataTypes } from 'sequelize';
import { sequelize } from './db';
import path from 'path';

class Character extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Character.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetPath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Character',
    tableName: 'characters',
    timestamps: true,
  }
);

export default Character;
