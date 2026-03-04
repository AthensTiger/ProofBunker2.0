import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists } from '../middleware/auth';
import upload from '../middleware/upload';
import { getMe, updateMe, verifyAge, updatePreferences, getContacts, uploadUserLogo, deleteUserLogo } from '../controllers/userController';
import '../types';

const router = Router();

// All user routes require authentication
router.use(jwtCheck as any, ensureUserExists);

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/verify-age', verifyAge);
router.put('/me/preferences', updatePreferences);
router.get('/contacts', getContacts);
router.post('/me/logo', upload.single('logo'), uploadUserLogo);
router.delete('/me/logo', deleteUserLogo);

export default router;
