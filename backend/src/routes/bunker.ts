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
import {
  getUnresolvedCount,
  getUnresolvedScans,
  createUnresolvedScan,
  uploadUnresolvedScanPhoto,
  resolveUnresolvedScan,
  deleteUnresolvedScan,
} from '../controllers/unresolvedScansController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);

// Unresolved barcode scans — static paths must come before /:id
router.get('/unresolved/count',         getUnresolvedCount);
router.get('/unresolved',               getUnresolvedScans);
router.post('/unresolved',              createUnresolvedScan);
router.post('/unresolved/:id/photos',   upload.single('photo'), uploadUnresolvedScanPhoto);
router.post('/unresolved/:id/resolve',  resolveUnresolvedScan);
router.delete('/unresolved/:id',        deleteUnresolvedScan);

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
