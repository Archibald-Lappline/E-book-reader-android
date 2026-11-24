import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ereader.material',
  appName: 'Читалка Книг',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: true
  }
};

export default config;
