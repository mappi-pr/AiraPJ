import express from 'express';
import path from 'path';
import { setRoutes } from './routes/index';
import { sessionMiddleware } from './config/session';
import { ensureUserId } from './middlewares/ensureUserId';
import { sequelize } from './models/db';
import './models/favorite';

const app = express();
app.set('view engine', 'ejs'); // EJSをテンプレートエンジンとして設定
app.set('views', path.join(__dirname, 'views')); // viewsディレクトリのパスを設定
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(ensureUserId);
app.use('/styles', express.static(path.join(__dirname, 'views', 'styles')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

setRoutes(app);

(async () => {
    await sequelize.sync(); // すべてのテーブルを自動作成
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})();