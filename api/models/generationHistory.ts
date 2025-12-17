import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class GenerationHistory extends Model {
  public id!: number;
  public userId!: string;
  public backgroundId!: number | null;
  public costumeId!: number | null;
  public backHairId!: number | null;
  public faceId!: number | null;
  public frontHairId!: number | null;
  public scale!: number;
  public dragX!: number;
  public dragY!: number;
  public imageUrl!: string | null; // Optional: store the generated image URL
  public createdAt!: Date;
}

GenerationHistory.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    backgroundId: { type: DataTypes.INTEGER, allowNull: true },
    costumeId: { type: DataTypes.INTEGER, allowNull: true },
    backHairId: { type: DataTypes.INTEGER, allowNull: true },
    faceId: { type: DataTypes.INTEGER, allowNull: true },
    frontHairId: { type: DataTypes.INTEGER, allowNull: true },
    scale: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.0 },
    dragX: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    dragY: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'GenerationHistory', tableName: 'generation_histories', timestamps: false }
);

export default GenerationHistory;
