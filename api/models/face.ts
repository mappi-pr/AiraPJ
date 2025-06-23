import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class Face extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
}

Face.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    assetPath: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Face', tableName: 'faces', timestamps: false }
);

export default Face;
