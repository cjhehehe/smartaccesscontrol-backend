// services/fcmService.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_KEY_PATH;
  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    throw new Error(`Service account key file not found at: ${serviceAccountPath}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('[Firebase] Admin initialized successfully.');
} catch (error) {
  console.error('[Firebase] Admin initialization error:', error);
}

export const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      // For Android, include notification settings to play sound and vibrate.
      android: {
        notification: {
          sound: 'default',
          // Example vibration pattern: [delay, vibrate, pause, vibrate]
          // Note: Vibration pattern might not be supported on all devices.
          vibrateTimingsMillis: [0, 500, 1000, 500],
          priority: 'high',
        },
      },
      data: {
        ...data,
      },
    };

    const response = await admin.messaging().send(message);
    console.log('[Firebase] Notification sent:', response);
    return response;
  } catch (error) {
    console.error('[Firebase] Error sending notification:', error);
    throw error;
  }
};
