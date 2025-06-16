import { Request, Response, NextFunction } from 'express';

// セッションにuserプロパティを追加する型拡張
declare module 'express-session' {
    interface SessionData {
        user?: any;
    }
}

export function sessionChecker(req: Request, res: Response, next: NextFunction) {
    // セッションがなければタイトル画面にリダイレクト
    if (!req.session || !req.session.user) {
        return res.redirect('/title');
    }
    next();
}
