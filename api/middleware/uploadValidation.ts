import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';

// アップロード可能な画像は PNG のみ（フロント側の accept="image/png" と揃える）。
// 拡張子と MIME タイプの両方をクライアント申告ベースで照合し、
// サーバー側でも迂回できないようにする。
export const ALLOWED_IMAGE_EXTENSION = '.png';
export const ALLOWED_IMAGE_MIME_TYPE = 'image/png';

// ファイルサイズ上限。パーツ画像（240×320 前提の PNG）には十分な余裕を持たせつつ、
// 巨大ファイルによるディスク枯渇を防ぐ。
export const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const imageFileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ALLOWED_IMAGE_EXTENSION && file.mimetype === ALLOWED_IMAGE_MIME_TYPE) {
    cb(null, true);
    return;
  }
  cb(new Error('Only PNG images are allowed'));
};

// upload.single() をラップし、検証エラー（種別・サイズ上限）を
// Express のデフォルトエラー応答（HTML 500）ではなく 400 の JSON で返す。
export function singleImageUpload(upload: multer.Multer, fieldName: string): RequestHandler {
  const handler = upload.single(fieldName);
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            error: `File too large. Maximum size is ${MAX_UPLOAD_FILE_SIZE / (1024 * 1024)}MB`,
          });
          return;
        }
        const message = err instanceof Error ? err.message : 'Upload failed';
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
  };
}
