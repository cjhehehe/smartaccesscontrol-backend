// services/fcmService.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

try {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_KEY;

  if (!serviceAccountEnv) {
    throw new Error('FIREBASE_SERVICE_KEY environment variable is not set.');
  }

  const serviceAccount = JSON.parse(serviceAccountEnv);

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
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
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
