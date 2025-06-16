import path from 'path';
import { Request, Response } from 'express';

class IndexController {
    getIndex(req: Request, res: Response) {
        res.sendFile(path.join(__dirname, '../views/index.html'));
    }
}

export default IndexController;