package com.burakozcc.inflationbasket

import android.app.Application
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

class InflationBasketApp : Application() {
    override fun onCreate() {
        super.onCreate()

        // Enable debug logs for development
        Purchases.logLevel = LogLevel.DEBUG

        // Configure RevenueCat
        val configuration = PurchasesConfiguration.Builder(this, "test_RTUWoYbTMrrSGPfnHrZPxcBNlLK")
            .build()
        Purchases.configure(configuration)
    }
}
