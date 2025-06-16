import { Request, Response } from 'express';
import Character from '../models/character';

export async function characterSelectPage(req: Request, res: Response) {
  const characters = await Character.findAll({ order: [['id', 'ASC']] });
  res.render('character', { characters });
}
