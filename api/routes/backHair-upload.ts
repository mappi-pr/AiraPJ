import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { BackHair } from '../models/backHair';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/backHair');
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

// POST /api/back-hair/upload
router.post('/upload', upload.single('asset'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const { name } = req.body;
    const assetPath = `/uploads/backHair/${req.file.filename}`;
    const backHair = await BackHair.create({ name, assetPath });
    res.json(backHair);
  } catch (err) {
    console.error('BackHair upload error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
});

export default router;
