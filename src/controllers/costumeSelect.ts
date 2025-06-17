import { Request, Response } from 'express';
import Costume from '../models/costume';

export async function costumeSelectPage(req: Request, res: Response) {
  const costumes = await Costume.findAll({ order: [['id', 'ASC']] });
  // Sequelizeインスタンスをplain object配列に変換
  const plainCostumes = costumes.map(c => c.get({ plain: true }));
  res.render('costume', { costumes: plainCostumes });
}
