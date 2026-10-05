import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.akhavan.jaipur',
  appName: 'Jaipur',
  webDir: 'dist/client',
  server: {
    androidScheme: 'https',
  },
};

export default config;
