import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.burakozcc.inflationbasket',
  appName: 'My Inflation Basket',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'myinflationbasket'
  }
};

export default config;