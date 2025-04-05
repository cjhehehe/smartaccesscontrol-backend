// services/fcmService.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

try {
  admin.initializeApp({
    credential: admin.credential.cert(require('../config/firebaseServiceKey.json')),
  });
} catch (error) {
  console.error("Firebase Admin initialization error: ", error);
}

export const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: { ...data },
    };
    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully: ", response);
    return response;
  } catch (error) {
    console.error("Error sending notification: ", error);
    throw error;
  }
};
