import { Request, Response } from 'express';
import Background from '../models/background';

export async function backgroundSelectPage(req: Request, res: Response) {
  const backgrounds = await Background.findAll({ order: [['id', 'ASC']] });
  // Sequelizeインスタンスをplain object配列に変換
  const plainBackgrounds = backgrounds.map(b => b.get({ plain: true }));
  res.render('background', { backgrounds: plainBackgrounds });
}
