import { Model, DataTypes } from 'sequelize';
import { sequelize } from './index';

export class GameMaster extends Model {
  public id!: number;
  public email!: string;
  public name!: string | null;
  public createdAt!: Date;
  public createdBy!: string | null;
}

GameMaster.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'created_by',
    },
  },
  {
    sequelize,
    modelName: 'GameMaster',
    tableName: 'game_masters',
    timestamps: false,
  }
);
