import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { Character } from '../models';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/chr'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// POST /api/character/upload
router.post('/upload', upload.single('asset'), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const { name } = req.body;
  const assetPath = `/uploads/chr/${req.file.filename}`;
  const character = await Character.create({ name, assetPath });
  res.json(character);
});

export default router;
