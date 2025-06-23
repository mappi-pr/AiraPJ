import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { Face } from '../models/face';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/face');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// POST /api/face/upload
router.post('/upload', upload.single('asset'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const { name } = req.body;
    const assetPath = `/uploads/face/${req.file.filename}`;
    const face = await Face.create({ name, assetPath });
    res.json(face);
  } catch (err) {
    console.error('Face upload error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
});

export default router;
