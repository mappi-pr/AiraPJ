import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class Face extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
  public deleted!: boolean;
  public deletedAt!: Date | null;
  public sortOrder!: number;
}

Face.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    assetPath: { type: DataTypes.STRING, allowNull: false },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'Face', tableName: 'faces', timestamps: false }
);

export default Face;
