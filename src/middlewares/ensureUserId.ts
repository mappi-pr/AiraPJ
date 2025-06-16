import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
// セッション型拡張
import 'express-session';
declare module 'express-session' {
    interface SessionData {
        userId?: string;
    }
}

export function ensureUserId(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) {
        req.session.userId = uuidv4();
    }
    next();
}
