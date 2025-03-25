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

router.get('/', getAllGuests);
router.get('/search', searchGuests);
router.post('/register', registerGuest);
router.post('/login', loginGuest);
router.get('/:guestId', fetchGuestProfileById);
router.post('/change_password', changeGuestPassword);
router.post('/edit_profile', updateGuestProfile);
router.post('/upload_avatar', uploadGuestAvatar);
router.post('/sign_out', signOutGuest);

export default router;
