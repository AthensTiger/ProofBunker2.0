import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireEmailVerified } from '../middleware/auth';
import upload from '../middleware/upload';
import { getLocations, createLocation, updateLocation, deleteLocation, uploadLocationLogo, deleteLocationLogo } from '../controllers/locationController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);

router.get('/', getLocations);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);
router.post('/:id/logo', upload.single('logo'), uploadLocationLogo);
router.delete('/:id/logo', deleteLocationLogo);

export default router;
