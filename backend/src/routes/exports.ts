import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireEmailVerified } from '../middleware/auth';
import { exportExcel, exportPdf, exportMenuPdf } from '../controllers/exportController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);

router.post('/excel', exportExcel);
router.post('/pdf', exportPdf);
router.post('/menus/:id/pdf', exportMenuPdf);

export default router;
