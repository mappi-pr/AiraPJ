import { Router } from 'express';
import GenerationHistory from '../models/generationHistory';
import User from '../models/user';

const router = Router();

// GET /api/generation-history?userId=xxx
// Get generation history for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Ensure user exists
    const [user] = await User.findOrCreate({
      where: { id: userId as string },
      defaults: { id: userId as string },
    });

    const histories = await GenerationHistory.findAll({
      where: { userId: userId as string },
      order: [['createdAt', 'DESC']],
      limit: 100, // Limit to last 100 generations
    });

    res.json(histories);
  } catch (error) {
    console.error('Error fetching generation history:', error);
    res.status(500).json({ error: 'Failed to fetch generation history' });
  }
});

// POST /api/generation-history
// Save a new generation
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      backgroundId,
      costumeId,
      backHairId,
      faceId,
      frontHairId,
      scale,
      dragX,
      dragY,
      imageUrl,
    } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Ensure user exists
    await User.findOrCreate({
      where: { id: userId },
      defaults: { id: userId },
    });

    const history = await GenerationHistory.create({
      userId,
      backgroundId: backgroundId || null,
      costumeId: costumeId || null,
      backHairId: backHairId || null,
      faceId: faceId || null,
      frontHairId: frontHairId || null,
      scale: scale || 1.0,
      dragX: dragX || 0,
      dragY: dragY || 0,
      imageUrl: imageUrl || null,
    });

    res.json(history);
  } catch (error) {
    console.error('Error creating generation history:', error);
    res.status(500).json({ error: 'Failed to create generation history' });
  }
});

// DELETE /api/generation-history/:id
// Delete a generation history entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) return res.status(400).json({ error: 'userId required' });

    await GenerationHistory.destroy({
      where: { id, userId: userId as string },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting generation history:', error);
    res.status(500).json({ error: 'Failed to delete generation history' });
  }
});

export default router;
