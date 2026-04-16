import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skunksquad.skunkfu',
  appName: 'Skunked: Way of the Spray',
  webDir: 'dist',

  // Android-specific configuration
  android: {
    // Disallow mixed content in production (HTTPS only)
    allowMixedContent: false,
    // Use hardware acceleration for our canvas game
    webContentsDebuggingEnabled: false,   // set true during dev
  },

  server: {
    // Serve assets from the local app bundle (no external server)
    androidScheme: 'https',
  },

  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0f0f1a',              // matches your theme
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f0f1a',
    },
    ScreenOrientation: {
      defaultOrientation: 'landscape',
    },
    AdMob: {
      testingDevices: [],
      initializeForTesting: false,
    },
  },
};

export default config;
