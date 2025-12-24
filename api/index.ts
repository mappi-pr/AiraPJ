import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import backgroundRouter from './routes/background';
import backgroundUploadRouter from './routes/background-upload';
import costumeRouter from './routes/costume';
import costumeUploadRouter from './routes/costume-upload';
import favoriteRouter from './routes/favorite';
import faceRouter from './routes/face';
import faceUploadRouter from './routes/face-upload';
import frontHairRouter from './routes/frontHair';
import frontHairUploadRouter from './routes/frontHair-upload';
import backHairRouter from './routes/backHair';
import backHairUploadRouter from './routes/backHair-upload';
import stickerRouter from './routes/sticker';
import stickerUploadRouter from './routes/sticker-upload';
import { sequelize } from './models';
import generationHistoryRouter from './routes/generation-history';
import navigationButtonRouter from './routes/navigationButton';
import navigationButtonUploadRouter from './routes/navigationButton-upload';
import { sequelize, NavigationButton } from './models';
import { getUploadsBasePath } from './config/uploads';

const app = express();
app.use(cors());
app.use(express.json());

// データベース接続状態を管理
let dbReady = false;

// データベース接続とテーブル初期化（リトライ機能付き）
async function initializeDatabase(retries = 5, delay = 5000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to connect to database (attempt ${i + 1}/${retries})...`);
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      await sequelize.sync();
      console.log('DB sync complete');
      
      // Initialize navigation button defaults if they don't exist
      const prevButton = await NavigationButton.findOne({ where: { buttonType: 'prev' } });
      const nextButton = await NavigationButton.findOne({ where: { buttonType: 'next' } });
      
      if (!prevButton) {
        await NavigationButton.create({ buttonType: 'prev', assetPath: null });
        console.log('Initialized default prev navigation button');
      }
      if (!nextButton) {
        await NavigationButton.create({ buttonType: 'next', assetPath: null });
        console.log('Initialized default next navigation button');
      }
      
      dbReady = true;
      return;
    } catch (err) {
      console.error(`DB connection failed (attempt ${i + 1}/${retries}):`, err);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Failed to connect to database after all retries');
        throw err;
      }
    }
  }
}

// ヘルスチェックAPI（DB接続状態も含む）
app.get('/api/health', async (req, res) => {
  if (!dbReady) {
    return res.status(503).json({ 
      status: 'unavailable', 
      message: 'Database not ready' 
    });
  }
  
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ 
      status: 'degraded', 
      database: 'disconnected',
      message: 'Database connection lost'
    });
  }
});

// DBが準備できていない場合のミドルウェア
app.use('/api/*', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  if (!dbReady) {
    return res.status(503).json({ 
      error: 'Service temporarily unavailable',
      message: 'Database is initializing, please try again in a moment' 
    });
  }
  next();
});

app.use('/api/background', backgroundRouter);
app.use('/api/background', backgroundUploadRouter);
app.use('/api/costume', costumeRouter);
app.use('/api/costume', costumeUploadRouter);
app.use('/api/favorite', favoriteRouter);
app.use('/api/face', faceRouter);
app.use('/api/face', faceUploadRouter);
app.use('/api/front-hair', frontHairRouter);
app.use('/api/front-hair', frontHairUploadRouter);
app.use('/api/back-hair', backHairRouter);
app.use('/api/back-hair', backHairUploadRouter);
app.use('/api/sticker', stickerRouter);
app.use('/api/sticker', stickerUploadRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/generation-history', generationHistoryRouter);
app.use('/api/navigation-buttons', navigationButtonRouter);
app.use('/api/navigation-buttons', navigationButtonUploadRouter);

// アップロードされたファイルを静的に配信
// 本番環境では UPLOADS_DIR 環境変数でパスを指定可能
const uploadsDir = getUploadsBasePath();
console.log(`Serving uploads from: ${uploadsDir}`);

// デバッグ用: リクエストログ
app.use('/uploads', (req, res, next) => {
  console.log(`Upload request: ${req.method} ${req.path}`);
  next();
});

// 静的ファイル配信にもCORSを適用
app.use('/uploads', cors(), express.static(uploadsDir));

const PORT = Number(process.env.PORT) || 4000;
// 本番環境ではセキュリティのため HOST 環境変数で制御可能
// 開発環境: '0.0.0.0' でDocker/スマホ実機からアクセス可能
// 本番環境: リバースプロキシ経由での利用を推奨
const HOST = process.env.HOST || '0.0.0.0';

// サーバー起動とDB初期化を並行して実行
async function startServer() {
  // サーバーを先に起動（ヘルスチェックエンドポイントのため）
  app.listen(PORT, HOST, () => {
    console.log(`API server running on ${HOST}:${PORT}`);
  });

  // データベースの初期化（バックグラウンドで実行）
  try {
    await initializeDatabase();
  } catch (err) {
    console.error('Database initialization failed. Server is running but API endpoints will return 503.');
  }
}

startServer();
