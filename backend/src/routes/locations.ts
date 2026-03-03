import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireEmailVerified } from '../middleware/auth';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../controllers/locationController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);

router.get('/', getLocations);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

export default router;
