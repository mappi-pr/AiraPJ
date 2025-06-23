import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { Costume } from '../models';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/csm');
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

// POST /api/costume/upload
router.post('/upload', upload.single('asset'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { name } = req.body;
  const assetPath = `/uploads/csm/${req.file.filename}`;
  const costume = await Costume.create({ name, assetPath });
  res.json(costume);
});

export default router;
