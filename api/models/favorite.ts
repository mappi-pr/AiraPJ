import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class Favorite extends Model {
  public id!: number;
  public userId!: string;
  public costumeId!: number;
}

Favorite.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    costumeId: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, modelName: 'Favorite', tableName: 'favorites', timestamps: false }
);

export default Favorite;
