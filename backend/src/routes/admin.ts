import { Router } from 'express';
import jwtCheck from '../config/auth';
import { ensureUserExists, requireRole } from '../middleware/auth';
import upload from '../middleware/upload';
import {
  getPendingProducts,
  approveProduct,
  rejectProduct,
  adminUpdateProduct,
  uploadProductImage,
  uploadProductImageFromUrl,
  deleteProductImage,
  getAllProducts,
  getAdminProduct,
  deleteProduct,
  getUnverifiedCompanies,
  getAllCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  mergeCompany,
  getUnverifiedDistillers,
  getAllDistillers,
  getDistiller,
  updateDistiller,
  deleteDistiller,
  mergeDistiller,
  getAllUsers,
  updateUserRole,
  setEmailVerified,
  updateUserFeatures,
} from '../controllers/adminController';
import '../types';

const router = Router();

router.use(jwtCheck as any, ensureUserExists, requireRole('admin', 'curator'));

// Products — listing
router.get('/pending-products', getPendingProducts);
router.get('/products', getAllProducts);
router.get('/products/:id', getAdminProduct);

// Products — mutations
router.put('/products/:id', adminUpdateProduct);
router.put('/products/:id/approve', approveProduct);
router.put('/products/:id/reject', rejectProduct);
router.delete('/products/:id', deleteProduct);

// Product images
router.post('/products/:id/images', upload.single('photo'), uploadProductImage);
router.post('/products/:id/images/url', uploadProductImageFromUrl);
router.delete('/products/images/:imageId', deleteProductImage);

// Companies
router.get('/unverified-companies', getUnverifiedCompanies);
router.get('/companies', getAllCompanies);
router.get('/companies/:id', getCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);
router.post('/companies/:id/merge', mergeCompany);

// Distillers
router.get('/unverified-distillers', getUnverifiedDistillers);
router.get('/distillers', getAllDistillers);
router.get('/distillers/:id', getDistiller);
router.put('/distillers/:id', updateDistiller);
router.delete('/distillers/:id', deleteDistiller);
router.post('/distillers/:id/merge', mergeDistiller);

// Users (admin only — role check inside controller)
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/email-verified', setEmailVerified);
router.put('/users/:id/features', updateUserFeatures);

export default router;
