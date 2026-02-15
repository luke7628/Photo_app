import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dematic.photosuite',
  appName: 'Photo APP',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    App: {
      exitOnBackButton: true
    },
    Keyboard: {
      resizeOnFullScreen: true
    }
  }
};

export default config;
