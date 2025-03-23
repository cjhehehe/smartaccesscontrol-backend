// routes/notificationRoutes.js
import express from 'express';
import {
  createNewNotification,
  createAdminNotification,
  getGuestNotifications,
  getAdminNotifications,
  markNotifRead,
  removeNotification,
  markAllAdminNotifsRead,
  clearAllAdminNotifs,
  markAllGuestNotifsRead,
  clearAllGuestNotifs,
  // IMPORT the new controller method:
  createGuestAndAdminNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// POST /api/notifications  (for Guest)
router.post('/', createNewNotification);

// POST /api/notifications/admin  (for Admin)
router.post('/admin', createAdminNotification);

// *** NEW ***
// POST /api/notifications/both -> creates two notifications:
// one for a guest, one for an admin.
router.post('/both', createGuestAndAdminNotification);

// GET /api/notifications/guest/:guest_id
router.get('/guest/:guest_id', getGuestNotifications);

// GET /api/notifications/admin/:admin_id
router.get('/admin/:admin_id', getAdminNotifications);

// PUT /api/notifications/:id/mark-read
router.put('/:id/mark-read', markNotifRead);

// PUT /api/notifications/admin/:admin_id/mark-all-read
router.put('/admin/:admin_id/mark-all-read', markAllAdminNotifsRead);

// PUT /api/notifications/guest/:guest_id/mark-all-read
router.put('/guest/:guest_id/mark-all-read', markAllGuestNotifsRead);

// DELETE /api/notifications/admin/:admin_id/clear-all
router.delete('/admin/:admin_id/clear-all', clearAllAdminNotifs);

// DELETE /api/notifications/guest/:guest_id/clear-all
router.delete('/guest/:guest_id/clear-all', clearAllGuestNotifs);

// DELETE /api/notifications/:id
router.delete('/:id', removeNotification);

export default router;
