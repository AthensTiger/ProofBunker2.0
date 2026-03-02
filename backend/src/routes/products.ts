import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireRole } from '../middleware/auth';
import {
  searchProducts,
  getProductByUpc,
  getProductById,
  autocomplete,
  autocompleteCompanies,
  autocompleteDistillers,
  getFilters,
  updateProduct,
  upsertTastingNote,
  deleteTastingNote,
} from '../controllers/productController';
import '../types';

const router = Router();

// Public product routes (no auth required)
router.get('/search', searchProducts);
router.get('/autocomplete', autocomplete);
router.get('/filters', getFilters);
router.get('/companies/autocomplete', autocompleteCompanies);
router.get('/distillers/autocomplete', autocompleteDistillers);
router.get('/upc/:upc', getProductByUpc);
router.get('/:id', getProductById);

// Protected product routes (admin/curator only)
router.put('/:id', jwtCheck as any, ensureUserExists, requireRole('admin', 'curator'), updateProduct);
router.post('/:id/tasting-notes', jwtCheck as any, ensureUserExists, requireRole('admin', 'curator'), upsertTastingNote);
router.delete('/:id/tasting-notes/:noteId', jwtCheck as any, ensureUserExists, requireRole('admin', 'curator'), deleteTastingNote);

export default router;
