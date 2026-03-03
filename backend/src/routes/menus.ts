import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireEmailVerified } from '../middleware/auth';
import {
  getMenuTemplates,
  getMenuTemplate,
  createMenuTemplate,
  updateMenuTemplate,
  deleteMenuTemplate,
  setMenuItems,
  getMenuPreview,
} from '../controllers/menuController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);

router.get('/', getMenuTemplates);
router.post('/', createMenuTemplate);
router.get('/:id', getMenuTemplate);
router.put('/:id', updateMenuTemplate);
router.delete('/:id', deleteMenuTemplate);
router.put('/:id/items', setMenuItems);
router.get('/:id/preview', getMenuPreview);

export default router;
