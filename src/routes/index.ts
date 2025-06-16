import { Router } from 'express';
import IndexController from '../controllers/index';
import { sessionChecker } from '../middlewares/sessionChecker';
import { uploadCharacterAsset } from '../controllers/characterUpload';
import { uploadBackgroundAsset } from '../controllers/backgroundUpload';
import { uploadCostumeAsset } from '../controllers/costumeUpload';

const router = Router();
const indexController = new IndexController();

export const setRoutes = (app: import('express').Express) => {
    app.use('/title', (req: import('express').Request, res: import('express').Response) => {
        res.render('title');
    });
    app.use('/character', sessionChecker, (req, res) => res.render('character'));
    app.use('/background', sessionChecker, (req, res) => res.render('background'));
    app.use('/costume', sessionChecker, (req, res) => res.render('costume'));
    app.use('/photo', sessionChecker, (req, res) => res.render('photo'));
    app.use('/settings', (req, res) => res.render('settings'));
    app.use('/terms', (req, res) => res.render('terms'));
    app.use('/', sessionChecker, router);
    router.get('/', indexController.getIndex.bind(indexController));
    app.post('/character/upload', uploadCharacterAsset);
    app.post('/background/upload', uploadBackgroundAsset);
    app.post('/costume/upload', uploadCostumeAsset);
};