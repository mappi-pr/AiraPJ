import { Model, DataTypes } from 'sequelize';
import { sequelize } from './db';
import path from 'path';

class Background extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Background.init(
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
    modelName: 'Background',
    tableName: 'backgrounds',
    timestamps: true,
  }
);

export default Background;
