import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists } from '../middleware/auth';
import { researchProduct } from '../controllers/researchController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists);
router.post('/product', researchProduct);

export default router;
