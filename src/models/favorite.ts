import { Model, DataTypes } from 'sequelize';
import { sequelize } from './db';
import User from './user';
import Costume from './costume';

class Favorite extends Model {
  public id!: number;
  public userId!: string;
  public costumeId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Favorite.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: User, key: 'id' },
    },
    costumeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Costume, key: 'id' },
    },
  },
  {
    sequelize,
    modelName: 'Favorite',
    tableName: 'favorites',
    timestamps: true,
  }
);

User.hasMany(Favorite, { foreignKey: 'userId' });
Favorite.belongsTo(User, { foreignKey: 'userId' });
Costume.hasMany(Favorite, { foreignKey: 'costumeId' });
Favorite.belongsTo(Costume, { foreignKey: 'costumeId' });

export default Favorite;
