import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class FrontHair extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
  public deleted!: boolean;
  public deletedAt!: Date | null;
}

FrontHair.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    assetPath: { type: DataTypes.STRING, allowNull: false },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'FrontHair', tableName: 'front_hairs', timestamps: false }
);

export default FrontHair;
