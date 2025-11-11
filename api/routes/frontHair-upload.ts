import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { FrontHair } from '../models/frontHair';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/frontHair');
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

// POST /api/front-hair/upload
router.post('/upload', upload.single('asset'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const { name } = req.body;
    const assetPath = `/uploads/frontHair/${req.file.filename}`;
    
    const maxOrderItem = await FrontHair.findOne({ 
      order: [['sortOrder', 'DESC']] 
    });
    const sortOrder = maxOrderItem ? maxOrderItem.sortOrder + 1 : 1;
    
    const frontHair = await FrontHair.create({ name, assetPath, sortOrder });
    res.json(frontHair);
  } catch (err) {
    console.error('FrontHair upload error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
});

export default router;
