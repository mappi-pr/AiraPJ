import { Sequelize, DataTypes, Model } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'airapj',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

export class Background extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
}
Background.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    assetPath: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Background', tableName: 'backgrounds', timestamps: false }
);

export class Costume extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
}
Costume.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    assetPath: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Costume', tableName: 'costumes', timestamps: false }
);

export { sequelize };
