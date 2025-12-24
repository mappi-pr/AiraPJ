import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { FrontHair } from '../models/frontHair';
import { getUploadsBasePath } from '../config/uploads';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(getUploadsBasePath(), 'frontHair');
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
    const { name, offsetX, offsetY, width, height } = req.body;
    const assetPath = `/uploads/frontHair/${req.file.filename}`;
    
    // Parse and validate numeric parameters (handle '0' as valid value)
    const parsedOffsetX = offsetX !== undefined && offsetX !== '' ? parseInt(offsetX) : 0;
    const parsedOffsetY = offsetY !== undefined && offsetY !== '' ? parseInt(offsetY) : 0;
    const parsedWidth = width !== undefined && width !== '' ? parseInt(width) : 240;
    const parsedHeight = height !== undefined && height !== '' ? parseInt(height) : 320;
    
    // Check for NaN values
    if (isNaN(parsedOffsetX) || isNaN(parsedOffsetY) || isNaN(parsedWidth) || isNaN(parsedHeight)) {
      res.status(400).json({ error: 'Invalid numeric values provided' });
      return;
    }
    
    // Validate ranges (allow negative offsets but reasonable limits)
    if (parsedOffsetX < -1000 || parsedOffsetX > 1000) {
      res.status(400).json({ error: 'offsetX must be between -1000 and 1000' });
      return;
    }
    if (parsedOffsetY < -1000 || parsedOffsetY > 1000) {
      res.status(400).json({ error: 'offsetY must be between -1000 and 1000' });
      return;
    }
    if (parsedWidth < 1 || parsedWidth > 2000) {
      res.status(400).json({ error: 'width must be between 1 and 2000' });
      return;
    }
    if (parsedHeight < 1 || parsedHeight > 2000) {
      res.status(400).json({ error: 'height must be between 1 and 2000' });
      return;
    }
    
    const maxOrderItem = await FrontHair.findOne({ 
      order: [['sortOrder', 'DESC']] 
    });
    const sortOrder = maxOrderItem ? maxOrderItem.sortOrder + 1 : 1;
    
    const frontHair = await FrontHair.create({ 
      name, 
      assetPath, 
      sortOrder,
      offsetX: parsedOffsetX,
      offsetY: parsedOffsetY,
      width: parsedWidth,
      height: parsedHeight,
    });
    res.json(frontHair);
  } catch (err) {
    console.error('FrontHair upload error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
});

export default router;
