import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.clubdreadnought.app',
  appName: 'Club Dreadnought',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
