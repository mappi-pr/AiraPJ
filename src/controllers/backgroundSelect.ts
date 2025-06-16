import { Request, Response } from 'express';
import Background from '../models/background';

export async function backgroundSelectPage(req: Request, res: Response) {
  const backgrounds = await Background.findAll({ order: [['id', 'ASC']] });
  res.render('background', { backgrounds });
}
