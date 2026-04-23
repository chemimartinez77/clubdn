import admin from 'firebase-admin';
import { prisma } from '../config/database';

let initialized = false;

function getFirebaseApp(): admin.app.App {
  if (!initialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase credentials not configured');
    }

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    initialized = true;
  }
  return admin.app();
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  const devices = await prisma.pushDevice.findMany({ where: { userId } });
  if (devices.length === 0) return;

  const app = getFirebaseApp();
  const messaging = app.messaging();

  const tokens: string[] = devices.map(d => d.token);
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
    android: { priority: 'high' },
  });

  const invalidTokens: string[] = [];
  response.responses.forEach((r, idx) => {
    const t = tokens[idx];
    if (!r.success && r.error?.code === 'messaging/registration-token-not-registered' && t) {
      invalidTokens.push(t);
    }
  });

  if (invalidTokens.length > 0) {
    await prisma.pushDevice.deleteMany({ where: { token: { in: invalidTokens } } });
  }
}

export async function sendPushToAll(title: string, body: string, data?: Record<string, string>): Promise<{ sent: number; failed: number }> {
  const devices = await prisma.pushDevice.findMany();
  if (devices.length === 0) return { sent: 0, failed: 0 };

  const app = getFirebaseApp();
  const messaging = app.messaging();

  const tokens: string[] = devices.map(d => d.token);
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
    android: { priority: 'high' },
  });

  const invalidTokens: string[] = [];
  response.responses.forEach((r, idx) => {
    const t = tokens[idx];
    if (!r.success && r.error?.code === 'messaging/registration-token-not-registered' && t) {
      invalidTokens.push(t);
    }
  });

  if (invalidTokens.length > 0) {
    await prisma.pushDevice.deleteMany({ where: { token: { in: invalidTokens } } });
  }

  return { sent: response.successCount, failed: response.failureCount };
}
