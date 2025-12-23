import { Router } from 'express';
import { NavigationButton } from '../models';

const router = Router();

// GET /api/navigation-buttons
router.get('/', async (req, res) => {
  try {
    const buttons = await NavigationButton.findAll();
    res.json(buttons);
  } catch (e) {
    console.error('Error fetching navigation buttons:', e);
    res.status(500).json({ error: 'Failed to fetch navigation buttons' });
  }
});

export default router;
