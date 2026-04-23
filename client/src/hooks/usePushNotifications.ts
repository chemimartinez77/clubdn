import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { api } from '../api/axios';

export function usePushNotifications(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn || !Capacitor.isNativePlatform()) return;

    async function init() {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') return;

      await PushNotifications.register();
    }

    void init();

    const registrationHandler = PushNotifications.addListener('registration', (token) => {
      void api.post('/api/push/register', { token: token.value, platform: 'android' }).catch(() => {});
    });

    const errorHandler = PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action:', action);
    });

    return () => {
      void registrationHandler.then(h => h.remove());
      void errorHandler.then(h => h.remove());
    };
  }, [isLoggedIn]);
}
