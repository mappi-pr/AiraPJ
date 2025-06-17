import { Router } from 'express';
import IndexController from '../controllers/index';
import { sessionChecker } from '../middlewares/sessionChecker';
import { uploadCharacterAsset } from '../controllers/characterUpload';
import { uploadBackgroundAsset } from '../controllers/backgroundUpload';
import { uploadCostumeAsset } from '../controllers/costumeUpload';
import { characterSelectPage } from '../controllers/characterSelect';
import { backgroundSelectPage } from '../controllers/backgroundSelect';
import { costumeSelectPage } from '../controllers/costumeSelect';

const router = Router();
const indexController = new IndexController();

export const setRoutes = (app: import('express').Express) => {
    app.use('/title', (req: import('express').Request, res: import('express').Response) => {
        res.render('title');
    });
    app.post('/character/upload', uploadCharacterAsset);
    app.post('/background/upload', uploadBackgroundAsset);
    app.post('/costume/upload', uploadCostumeAsset);
    app.use('/character', sessionChecker, characterSelectPage);
    app.use('/background', sessionChecker, backgroundSelectPage);
    app.use('/costume', sessionChecker, costumeSelectPage);
    app.use('/photo', sessionChecker, (req, res) => res.render('photo'));
    app.use('/history', sessionChecker, (req, res) => res.render('history'));
    app.use('/settings', (req, res) => res.render('settings'));
    app.use('/terms', (req, res) => res.render('terms'));
    app.use('/', sessionChecker, router);
    router.get('/', indexController.getIndex.bind(indexController));
};