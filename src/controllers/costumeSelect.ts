import { Request, Response } from 'express';
import Costume from '../models/costume';

export async function costumeSelectPage(req: Request, res: Response) {
  const costumes = await Costume.findAll({ order: [['id', 'ASC']] });
  res.render('costume', { costumes });
}
