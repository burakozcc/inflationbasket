import { registerPlugin } from '@capacitor/core';
const RevenueCatUI = registerPlugin('RevenueCatUI', {
    web: () => import('./web').then((m) => new m.RevenueCatUIWeb()),
});
export * from './definitions';
export { PAYWALL_RESULT } from '@revenuecat/purchases-typescript-internal-esm';
export { RevenueCatUI };
//# sourceMappingURL=index.js.map