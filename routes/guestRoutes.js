// routes/guestRoutes.js
import express from 'express';
import {
  registerGuest,
  loginGuest,
  fetchGuestProfileById,
  changeGuestPassword,
  updateGuestProfile,
  signOutGuest,
  uploadGuestAvatar,
  searchGuests,
  getAllGuests,
  updateGuestFcmToken,
} from '../controllers/guestController.js';

const router = express.Router();

// GET /api/guests/  => getAllGuests
router.get('/', getAllGuests);

// GET /api/guests/search?query=...
router.get('/search', searchGuests);

// POST /api/guests/register
router.post('/register', registerGuest);

// POST /api/guests/login
router.post('/login', loginGuest);

// GET /api/guests/:guestId
router.get('/:guestId', fetchGuestProfileById);

// POST /api/guests/change_password
router.post('/change_password', changeGuestPassword);

// POST /api/guests/edit_profile
router.post('/edit_profile', updateGuestProfile);

// POST /api/guests/upload_avatar
router.post('/upload_avatar', uploadGuestAvatar);

// POST /api/guests/sign_out
router.post('/sign_out', signOutGuest);

// NEW: POST /api/guests/update-fcm-token
router.post('/update-fcm-token', updateGuestFcmToken);

export default router;
