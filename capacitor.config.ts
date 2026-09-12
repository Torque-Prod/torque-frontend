import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.torque.app',
  appName: 'Torque',
  webDir: 'dist/angular-frontend/browser',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['192.168.68.87']
  }
};

export default config;
