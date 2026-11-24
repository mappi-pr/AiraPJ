import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize';

// 生成履歴に保存するステッカー配置1枚分（Issue #165）。
// 配列の並び順がそのまま重なり順になる。サイズは仕様どおり常に元画像の100%で、
// 配置ごとに変わらないため保持しない。座標は Photo のキャプチャ領域
// （240x320）内の px 値で、フロントの StickerInstance と同じ表現。
export interface StickerPlacement {
  stickerId: number;
  x: number;
  y: number;
}

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
  public stickers!: StickerPlacement[] | null;
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
    // ステッカー配置は履歴行に属する値の列であり、独立して検索・参照される
    // ことがないため、関連テーブルではなく JSON カラムに配列で保持する（Issue #165）。
    // 配置情報のない既存履歴は NULL のままで従来どおり扱える。
    stickers: { type: DataTypes.JSON, allowNull: true, defaultValue: null },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'GenerationHistory', tableName: 'generation_histories', timestamps: false }
);

export default GenerationHistory;
