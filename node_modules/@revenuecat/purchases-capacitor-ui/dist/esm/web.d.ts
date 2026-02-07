import { WebPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { PaywallResult, PresentPaywallIfNeededOptions, PresentPaywallOptions, RevenueCatUIPlugin } from './definitions';
export declare class RevenueCatUIWeb extends WebPlugin implements RevenueCatUIPlugin {
    private shouldMockWebResults;
    private webNotSupportedErrorMessage;
    constructor();
    setMockWebResults(options: {
        shouldMockWebResults: boolean;
    }): Promise<void>;
    presentPaywall(options?: PresentPaywallOptions): Promise<PaywallResult>;
    presentPaywallIfNeeded(options: PresentPaywallIfNeededOptions): Promise<PaywallResult>;
    presentCustomerCenter(): Promise<void>;
    addListener(eventName: string, listener: (...args: any[]) => void): Promise<PluginListenerHandle>;
    removeAllListeners(): Promise<void>;
    private mockNonReturningFunctionIfEnabled;
    private mockReturningFunctionIfEnabled;
}
