// server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { apiLimiter } from './middlewares/rateLimitMiddleware.js';

// Import your route modules
import authRoutes from './routes/authRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import rfidRoutes from './routes/rfidRoutes.js';
import serviceRequestRoutes from './routes/serviceRequestRoutes.js';
import roomsRoutes from './routes/roomsRoutes.js';
import accessLogRoutes from './routes/accessLogRoutes.js';
import activityLogRoutes from './routes/activityLogRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import macAddressRoutes from './routes/macAddressRoutes.js';
import mikrotikRoutes from './routes/mikrotikRoutes.js';

// NEW: Import the reset routes
import resetRoutes from './routes/resetRoutes.js';

import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();
const app = express();

// Core Middlewares
app.set('trust proxy', 1);
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(apiLimiter);

// Mount your routes
app.use('/api/auth', authRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/rfid', rfidRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/access-logs', accessLogRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/feedback', feedbackRoutes);

// Notifications routes (including the new endpoints)
app.use('/api/notifications', notificationRoutes);

app.use('/api/mac-address', macAddressRoutes);
app.use('/api/mikrotik', mikrotikRoutes);

// NEW: Mount the reset routes on /api/setup
app.use('/api/setup', resetRoutes);

// Root and Catch-All Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Smart Access Control API.');
});
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found. Please check your URL and try again.'
  });
});

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
