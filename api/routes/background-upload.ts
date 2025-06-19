import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { Background } from '../models';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/bg'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// POST /api/background/upload
router.post('/upload', upload.single('asset'), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const { name } = req.body;
  const assetPath = `/uploads/bg/${req.file.filename}`;
  const background = await Background.create({ name, assetPath });
  res.json(background);
});

export default router;
