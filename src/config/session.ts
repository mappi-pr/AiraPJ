import expressSession from 'express-session';

export const sessionMiddleware = expressSession({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1時間
});
