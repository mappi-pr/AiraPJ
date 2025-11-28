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
import { sequelize } from './models';
import { getUploadsBasePath } from './config/uploads';

const app = express();
app.use(cors());
app.use(express.json());

// サンプルAPI
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

(async () => {
  try {
    await sequelize.sync();
    console.log('DB sync complete');
  } catch (err) {
    console.error('DB sync error:', err);
  }
})();

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

// アップロードされたファイルを静的に配信
// 本番環境では UPLOADS_DIR 環境変数でパスを指定可能
const uploadsDir = getUploadsBasePath();
console.log(`Serving uploads from: ${uploadsDir}`);

// 静的ファイル配信にもCORSを適用
app.use('/uploads', cors(), express.static(uploadsDir));

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
