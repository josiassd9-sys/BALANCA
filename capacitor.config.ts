import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.psinox.balanca',
  appName: 'Balança PS INOX',
  webDir: 'out', // Onde o Next.js coloca os arquivos estáticos
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;
