import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class NavigationButton extends Model {
  public id!: number;
  public buttonType!: 'prev' | 'next';
  public assetPath!: string | null;
}

NavigationButton.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    buttonType: { 
      type: DataTypes.ENUM('prev', 'next'), 
      allowNull: false,
      unique: true
    },
    assetPath: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'NavigationButton', tableName: 'navigation_buttons', timestamps: false }
);

export default NavigationButton;
