import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.psinox.balanca',
  appName: 'balanca',
  webDir: 'out',

  server: {
    androidScheme: 'http',
    allowNavigation: [
      "192.168.18.13",
      "http://192.168.18.13",
      "192.168.18.13:3000"
    ]
  }
};

export default config;