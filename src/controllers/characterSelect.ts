import { Request, Response } from 'express';
import Character from '../models/character';

export async function characterSelectPage(req: Request, res: Response) {
  const characters = await Character.findAll({ order: [['id', 'ASC']] });
  // Sequelizeインスタンスをplain object配列に変換
  const plainCharacters = characters.map(c => c.get({ plain: true }));
  res.render('character', { characters: plainCharacters });
}
