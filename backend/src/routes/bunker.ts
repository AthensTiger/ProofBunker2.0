import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireEmailVerified } from '../middleware/auth';
import upload from '../middleware/upload';
import {
  getBunkerList,
  getBunkerItem,
  addToBunker,
  updateBunkerItem,
  removeBunkerItem,
  updateBottle,
  deleteBottle,
  uploadBottlePhoto,
  uploadBottlePhotoFromUrl,
  deleteBottlePhoto,
} from '../controllers/bunkerController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);

// Bottles (physical bottle-level) — static paths before :id params
router.put('/bottles/:bottleId', updateBottle);
router.delete('/bottles/:bottleId', deleteBottle);
router.post('/bottles/:bottleId/photos', upload.single('photo'), uploadBottlePhoto);
router.post('/bottles/:bottleId/photos/url', uploadBottlePhotoFromUrl);
router.delete('/photos/:photoId', deleteBottlePhoto);

// Bunker items (product-level)
router.get('/', getBunkerList);
router.post('/', addToBunker);
router.get('/:id', getBunkerItem);
router.put('/:id', updateBunkerItem);
router.delete('/:id', removeBunkerItem);

export default router;
