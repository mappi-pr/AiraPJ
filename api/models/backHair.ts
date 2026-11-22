import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class BackHair extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
  public deleted!: boolean;
  public deletedAt!: Date | null;
  public sortOrder!: number;
  public offsetX!: number;
  public offsetY!: number;
  public width!: number;
  public height!: number;
}

BackHair.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    assetPath: { type: DataTypes.STRING, allowNull: false },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    offsetX: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    offsetY: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    width: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 240 },
    height: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 320 },
  },
  { sequelize, modelName: 'BackHair', tableName: 'back_hairs', timestamps: false }
);

export default BackHair;
