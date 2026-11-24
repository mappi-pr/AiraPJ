import { Router } from 'express';
import { Op } from 'sequelize';
import GenerationHistory from '../models/generationHistory';
import User from '../models/user';
import { Background, Costume } from '../models';
import { BackHair } from '../models/backHair';
import { Face } from '../models/face';
import { FrontHair } from '../models/frontHair';

const router = Router();

// 履歴が参照するパーツがすべて現存する（論理削除されていない）かを一括で判定する。
// 履歴件数によらず、リソースごとに IN 句で1回ずつ照会する（最大5クエリ）。
async function computeAvailability(histories: GenerationHistory[]): Promise<boolean[]> {
  const collectIds = (pick: (h: GenerationHistory) => number | null) =>
    [...new Set(histories.map(pick).filter((id): id is number => id != null))];

  const aliveIds = async (
    model: { findAll: (options: object) => Promise<unknown> },
    ids: number[]
  ): Promise<Set<number>> => {
    if (ids.length === 0) return new Set();
    const rows = (await model.findAll({
      where: { id: { [Op.in]: ids }, deleted: false },
      attributes: ['id'],
    })) as Array<{ id: number }>;
    return new Set(rows.map(row => row.id));
  };

  const [backgrounds, costumes, backHairs, faces, frontHairs] = await Promise.all([
    aliveIds(Background, collectIds(h => h.backgroundId)),
    aliveIds(Costume, collectIds(h => h.costumeId)),
    aliveIds(BackHair, collectIds(h => h.backHairId)),
    aliveIds(Face, collectIds(h => h.faceId)),
    aliveIds(FrontHair, collectIds(h => h.frontHairId)),
  ]);

  const alive = (id: number | null, set: Set<number>) => id == null || set.has(id);

  return histories.map(h =>
    alive(h.backgroundId, backgrounds) &&
    alive(h.costumeId, costumes) &&
    alive(h.backHairId, backHairs) &&
    alive(h.faceId, faces) &&
    alive(h.frontHairId, frontHairs)
  );
}

// GET /api/generation-history?userId=xxx
// Get generation history for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Ensure user exists
    await User.findOrCreate({
      where: { id: userId as string },
      defaults: { id: userId as string },
    });

    const histories = await GenerationHistory.findAll({
      where: { userId: userId as string },
      order: [['createdAt', 'DESC']],
      limit: 100, // Limit to last 100 generations
    });

    const availability = await computeAvailability(histories);

    res.json(histories.map((history, i) => ({ ...history.toJSON(), isAvailable: availability[i] })));
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
