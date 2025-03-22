// routes/adminRoutes.js
import express from 'express';
import {
  createAdmin,
  loginAdmin,
  changeAdminPassword,
  updateAdminProfile,
  uploadAdminAvatar,
  signOutAdmin,
  getAllAdminsController,
} from '../controllers/adminController.js';

const router = express.Router();

// POST /api/admins/create
router.post('/create', createAdmin);

// POST /api/admins/login
router.post('/login', loginAdmin);

// POST /api/admins/change_password
router.post('/change_password', changeAdminPassword);

// POST /api/admins/edit_profile
router.post('/edit_profile', updateAdminProfile);

// POST /api/admins/upload_avatar
router.post('/upload_avatar', uploadAdminAvatar);

// POST /api/admins/sign_out
router.post('/sign_out', signOutAdmin);

// GET /api/admins
router.get('/', getAllAdminsController);

export default router;
