// routes/roomsRoutes.js

import express from 'express';
import {
  addRoom,
  getRoom,
  getRooms,
  modifyRoom,
  removeRoom,
  roomCheckIn,
  roomCheckOut,
  assignRoomByNumber,
  updateRoomStatusByNumber,
} from '../controllers/roomsController.js';

const router = express.Router();

// Create a new room record (for creating a reservation)
router.post('/', addRoom);

// Get all rooms
router.get('/', getRooms);

// Get a specific room by ID
router.get('/:id', getRoom);

/**
 * IMPORTANT: Place this route above '/:id' so Express doesn't interpret "assign" as an :id.
 */
router.put('/assign', assignRoomByNumber);

// Update room details by room ID
router.put('/:id', modifyRoom);

// Delete a room record by ID
router.delete('/:id', removeRoom);

// Check-In endpoint: sets check_in time and status='occupied'
router.post('/:id/checkin', roomCheckIn);

// Check-Out endpoint: sets check_out time and status='available'
router.post('/:id/checkout', roomCheckOut);

// NEW: Update room status by room_number (similar to service-requests/ID/update-status)
router.put('/:room_number/update-status', updateRoomStatusByNumber);

export default router;
