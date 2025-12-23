import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { Background } from '../models';
import { getUploadsBasePath } from '../config/uploads';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(getUploadsBasePath(), 'bg');
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

// POST /api/background/upload
router.post('/upload', upload.single('asset'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const { name, offsetX, offsetY, width, height } = req.body;
    const assetPath = `/uploads/bg/${req.file.filename}`;
    
    const maxOrderItem = await Background.findOne({ 
      order: [['sortOrder', 'DESC']] 
    });
    const sortOrder = maxOrderItem ? maxOrderItem.sortOrder + 1 : 1;
    
    const background = await Background.create({ 
      name, 
      assetPath, 
      sortOrder,
      offsetX: offsetX ? parseInt(offsetX) : 0,
      offsetY: offsetY ? parseInt(offsetY) : 0,
      width: width ? parseInt(width) : 240,
      height: height ? parseInt(height) : 320,
    });
    res.json(background);
  } catch (err) {
    console.error('Background upload error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
});

export default router;
