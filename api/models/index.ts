import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize';

export class Background extends Model {
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
Background.init(
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
  { sequelize, modelName: 'Background', tableName: 'backgrounds', timestamps: false }
);

export class Costume extends Model {
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
Costume.init(
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
  { sequelize, modelName: 'Costume', tableName: 'costumes', timestamps: false }
);

// Import and initialize User and GenerationHistory models after sequelize is defined
import './user';
import './generationHistory';

export { NavigationButton } from './navigationButton';
export { sequelize };
