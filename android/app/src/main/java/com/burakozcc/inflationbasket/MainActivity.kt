package com.burakozcc.inflationbasket

import android.os.Bundle
import android.util.Log
import com.getcapacitor.BridgeActivity
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallActivityLauncher
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallResult
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallResultHandler

class MainActivity : BridgeActivity(), PaywallResultHandler {

    private lateinit var paywallLauncher: PaywallActivityLauncher

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Launcher
        paywallLauncher = PaywallActivityLauncher(this, this)

        // Example: Check entitlement on startup
        checkSubscriptionStatus()
    }

    private fun checkSubscriptionStatus() {
        SubscriptionManager.isProActive { isPro ->
            if (isPro) {
                Log.d("InflationBasket", "User has Pro access!")
            } else {
                Log.d("InflationBasket", "User is on Free tier.")
            }
        }
    }

    /**
     * Launch the RevenueCat Paywall
     */
    fun showPaywall() {
        paywallLauncher.launch()
    }

    override fun onActivityResult(result: PaywallResult) {
        when (result) {
            is PaywallResult.Purchased -> {
                Log.d("InflationBasket", "Purchase successful")
            }
            is PaywallResult.Cancelled -> {
                Log.d("InflationBasket", "User cancelled the paywall")
            }
            is PaywallResult.Error -> {
                Log.e("InflationBasket", "Paywall error: ${result.error}")
            }
            is PaywallResult.Restored -> {
                Log.d("InflationBasket", "Purchases restored successfully")
            }
        }
    }
}
