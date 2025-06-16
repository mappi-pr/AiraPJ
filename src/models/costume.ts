import { Model, DataTypes } from 'sequelize';
import { sequelize } from './db';
import path from 'path';

class Costume extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Costume.init(
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
    modelName: 'Costume',
    tableName: 'costumes',
    timestamps: true,
  }
);

export default Costume;
