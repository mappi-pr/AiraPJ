import dotenv from 'dotenv';
dotenv.config();
import expressSession from 'express-session';

export const sessionMiddleware = expressSession({
    secret: process.env.SESSION_SECRET ?? 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1時間
});
