import { Sequelize, DataTypes, Model } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './db.sqlite',
});

export class Character extends Model {
  public id!: number;
  public name!: string;
  public assetPath!: string;
}
Character.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    assetPath: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Character', tableName: 'characters', timestamps: false }
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
