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
} from '../controllers/guestController.js';

const router = express.Router();

/**
 * GET /api/guests
 * Returns all guests as { "guests": [...] }
 */
router.get('/', getAllGuests);

/**
 * GET /api/guests/search?query=...
 * Search guests by name, email, or phone.
 */
router.get('/search', searchGuests);

/**
 * POST /api/guests/register
 * Register a new guest.
 */
router.post('/register', registerGuest);

/**
 * POST /api/guests/login
 * Guest login (supports email or phone).
 */
router.post('/login', loginGuest);

/**
 * GET /api/guests/:guestId
 * Fetch a single guest profile by ID.
 */
router.get('/:guestId', fetchGuestProfileById);

/**
 * POST /api/guests/change_password
 * Change guest password.
 */
router.post('/change_password', changeGuestPassword);

/**
 * POST /api/guests/edit_profile
 * Update guest profile.
 */
router.post('/edit_profile', updateGuestProfile);

/**
 * POST /api/guests/upload_avatar
 * Dedicated endpoint to upload guest avatar.
 */
router.post('/upload_avatar', uploadGuestAvatar);

/**
 * POST /api/guests/sign_out
 * Sign out a guest.
 */
router.post('/sign_out', signOutGuest);

export default router;
