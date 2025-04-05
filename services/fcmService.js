// services/fcmService.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

try {
  const raw = process.env.FIREBASE_SERVICE_KEY;

  if (!raw) throw new Error('FIREBASE_SERVICE_KEY environment variable is not set.');

  // Parse and fix the private key
  const parsed = JSON.parse(raw);
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(parsed),
  });

  console.log('[Firebase] Admin initialized successfully.');
} catch (error) {
  console.error('[Firebase] Admin initialization error:', error);
}

export const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
      data: { ...data },
    };

    const response = await admin.messaging().send(message);
    console.log('[Firebase] Notification sent:', response);
    return response;
  } catch (error) {
    console.error('[Firebase] Error sending notification:', error);
    throw error;
  }
};
