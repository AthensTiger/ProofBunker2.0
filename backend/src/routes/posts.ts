import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireEmailVerified, requireRole } from '../middleware/auth';
import {
  getPublishedPosts,
  getMyPosts,
  createPost,
  updatePost,
  submitPost,
  deletePost,
  getPendingPosts,
  approvePost,
  rejectPost,
} from '../controllers/postsController';
import '../types';

const router = Router();

// Public — no auth required
router.get('/', getPublishedPosts);

// Curator / Admin routes (declare before the requireEmailVerified middleware block)
router.get('/pending', jwtCheck as any, ensureUserExists, requireRole('admin', 'curator'), getPendingPosts);
router.post('/:id/approve', jwtCheck as any, ensureUserExists, requireRole('admin', 'curator'), approvePost);
router.post('/:id/reject', jwtCheck as any, ensureUserExists, requireRole('admin', 'curator'), rejectPost);

// Authenticated user routes
router.use(jwtCheck as any, ensureUserExists, requireEmailVerified);
router.get('/mine', getMyPosts);
router.post('/', createPost);
router.put('/:id', updatePost);
router.post('/:id/submit', submitPost);
router.delete('/:id', deletePost);

export default router;
