import express from 'express';
import { setRoutes } from './routes/index';
import { sessionMiddleware } from './config/session';
import { ensureUserId } from './middlewares/ensureUserId';
import { sequelize } from './models/db';
import './models/favorite';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(ensureUserId);

setRoutes(app);

(async () => {
    await sequelize.sync(); // すべてのテーブルを自動作成
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})();