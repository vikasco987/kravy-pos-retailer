import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.kravy.pos',
  appName: 'Kravy 360',
  webDir: 'public',
  server: {
    url: 'https://pos.kravy.in',
    cleartext: true
  },
  plugins: {
    CapacitorCookies: {
      enabled: true
    }
  }
};

export default config;
