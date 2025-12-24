import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { NavigationButton } from '../models';
import { getUploadsBasePath } from '../config/uploads';

const router = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(getUploadsBasePath(), 'nav');
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

// POST /api/navigation-buttons/upload
router.post('/upload', upload.single('asset'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const { buttonType } = req.body;
    
    if (buttonType !== 'prev' && buttonType !== 'next') {
      res.status(400).json({ error: 'Invalid buttonType. Must be "prev" or "next".' });
      return;
    }
    
    const assetPath = `/uploads/nav/${req.file.filename}`;
    
    // Find or create the button configuration
    let button = await NavigationButton.findOne({ where: { buttonType } });
    
    // Delete old file if exists
    if (button && button.assetPath) {
      let oldFilePath = button.assetPath;
      if (!path.isAbsolute(oldFilePath)) {
        oldFilePath = path.join(process.cwd(), oldFilePath.replace(/^\//, ''));
      }
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    if (button) {
      button.assetPath = assetPath;
      await button.save();
    } else {
      button = await NavigationButton.create({ buttonType, assetPath });
    }
    
    res.json(button);
  } catch (err) {
    console.error('Navigation button upload error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
});

// DELETE /api/navigation-buttons/:buttonType/reset
router.delete('/:buttonType/reset', async (req, res) => {
  try {
    const { buttonType } = req.params;
    
    if (buttonType !== 'prev' && buttonType !== 'next') {
      res.status(400).json({ error: 'Invalid buttonType. Must be "prev" or "next".' });
      return;
    }
    
    const button = await NavigationButton.findOne({ where: { buttonType } });
    if (!button) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Delete the file if exists
    if (button.assetPath) {
      let filePath = button.assetPath;
      if (!path.isAbsolute(filePath)) {
        filePath = path.join(process.cwd(), filePath.replace(/^\//, ''));
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Reset to null (use default text)
    button.assetPath = null;
    await button.save();
    
    res.json({ success: true, button });
  } catch (e) {
    console.error('Navigation button reset error:', e);
    res.status(500).json({ error: 'Reset failed' });
  }
});

export default router;
