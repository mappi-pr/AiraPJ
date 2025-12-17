import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class User extends Model {
  public id!: string; // UUID from frontend
  public createdAt!: Date;
}

User.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'User', tableName: 'users', timestamps: false }
);

export default User;
