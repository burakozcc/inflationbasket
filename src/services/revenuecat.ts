import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';

// Access environment variables safely
const env = (import.meta as any).env;
const API_KEY_ANDROID = env?.VITE_REVENUECAT_API_KEY_ANDROID;
const API_KEY_IOS = env?.VITE_REVENUECAT_API_KEY_IOS;
const ENTITLEMENT_ID = env?.VITE_REVENUECAT_ENTITLEMENT_ID || 'premium';

export const initRevenueCat = async (appUserId: string): Promise<void> => {
    if (Capacitor.getPlatform() === 'web') {
        console.log('RevenueCat: Web platform detected, skipping initialization.');
        return;
    }

    const apiKey = Capacitor.getPlatform() === 'android' ? API_KEY_ANDROID : API_KEY_IOS;

    if (!apiKey) {
        console.warn('RevenueCat: No API key found for this platform.');
        return;
    }

    try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({ apiKey, appUserID: appUserId });
        console.log('RevenueCat: Configured successfully');
    } catch (error) {
        console.error('RevenueCat: Configuration failed', error);
    }
};

export const presentPaywall = async (): Promise<{ purchased: boolean }> => {
    if (Capacitor.getPlatform() === 'web') {
        alert('Subscriptions are managed via the mobile app.');
        return { purchased: false };
    }

    try {
        // Present the paywall for the required entitlement
        const result = await RevenueCatUI.presentPaywallIfNeeded({
            requiredEntitlementIdentifier: ENTITLEMENT_ID,
        });

        if (result === RevenueCatUI.PAYWALL_RESULT.PURCHASED || result === RevenueCatUI.PAYWALL_RESULT.RESTORED) {
            return { purchased: true };
        }
        
        // If the user was already premium (NOT_PRESENTED) or cancelled
        if (result === RevenueCatUI.PAYWALL_RESULT.NOT_PRESENTED) {
            // Double check entitlement status
            const customerInfo = await Purchases.getCustomerInfo();
            if (customerInfo.customerInfo.entitlements.active[ENTITLEMENT_ID]) {
                return { purchased: true };
            }
        }

        return { purchased: false };
    } catch (error) {
        console.error('RevenueCat: Paywall error', error);
        return { purchased: false };
    }
};

export const presentCustomerCenter = async (): Promise<void> => {
    if (Capacitor.getPlatform() === 'web') {
        alert('Manage your subscription via the store where you purchased it.');
        return;
    }

    try {
        await RevenueCatUI.presentCustomerCenter();
    } catch (error) {
        console.error('RevenueCat: Customer Center error', error);
    }
};

export const getCustomerInfo = async (): Promise<any> => {
    if (Capacitor.getPlatform() === 'web') return null;
    try {
        return await Purchases.getCustomerInfo();
    } catch (error) {
        console.error('RevenueCat: Get Customer Info error', error);
        return null;
    }
};