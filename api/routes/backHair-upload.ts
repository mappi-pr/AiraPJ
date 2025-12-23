import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { BackHair } from '../models/backHair';
import { getUploadsBasePath } from '../config/uploads';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(getUploadsBasePath(), 'backHair');
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
    const { name, offsetX, offsetY, width, height } = req.body;
    const assetPath = `/uploads/backHair/${req.file.filename}`;
    
    const maxOrderItem = await BackHair.findOne({ 
      order: [['sortOrder', 'DESC']] 
    });
    const sortOrder = maxOrderItem ? maxOrderItem.sortOrder + 1 : 1;
    
    const backHair = await BackHair.create({ 
      name, 
      assetPath, 
      sortOrder,
      offsetX: offsetX ? parseInt(offsetX) : 0,
      offsetY: offsetY ? parseInt(offsetY) : 0,
      width: width ? parseInt(width) : 240,
      height: height ? parseInt(height) : 320,
    });
    res.json(backHair);
  } catch (err) {
    console.error('BackHair upload error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
});

export default router;
