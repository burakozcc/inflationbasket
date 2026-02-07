import { CapacitorConfig } from '@capacitor/cli';

// Use standard https/localhost to avoid WebView 117+ custom scheme issues.
const config: CapacitorConfig = {
  appId: 'com.burakozcc.inflationbasket',
  appName: 'My Inflation Basket',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    androidHostname: 'localhost',
    hostname: 'localhost',
  },
};

export default config;