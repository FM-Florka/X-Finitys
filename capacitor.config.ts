import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xlines.app',
  appName: 'X-Finitys',
  webDir: 'out',
  server: {
    url: 'https://x-finitys.vercel.app/login',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;