package com.burakozcc.inflationbasket

import android.app.Activity
import android.util.Log
import com.revenuecat.purchases.*
import com.revenuecat.purchases.interfaces.PurchaseCallback
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback
import com.revenuecat.purchases.interfaces.ReceiveOfferingsCallback
import com.revenuecat.purchases.models.StoreTransaction

object SubscriptionManager {
    private const val TAG = "SubscriptionManager"
    const val ENTITLEMENT_PRO = "InflationBasket Pro"

    /**
     * Check if the user has an active "InflationBasket Pro" entitlement.
     */
    fun isProActive(callback: (Boolean) -> Unit) {
        Purchases.sharedInstance.getCustomerInfo(object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) {
                val isActive = customerInfo.entitlements[ENTITLEMENT_PRO]?.isActive == true
                callback(isActive)
            }

            override fun onError(error: PurchasesError) {
                Log.e(TAG, "Error fetching customer info: ${error.message}")
                callback(false)
            }
        })
    }

    /**
     * Fetch current offerings and identify your specific products.
     */
    fun fetchOfferings(callback: (monthly: Package?, yearly: Package?, lifetime: Package?) -> Unit) {
        Purchases.sharedInstance.getOfferings(object : ReceiveOfferingsCallback {
            override fun onReceived(offerings: Offerings) {
                val current = offerings.current
                val monthly = current?.monthly
                val yearly = current?.annual // In newer SDKs, 'yearly' is 'annual'
                val lifetime = current?.lifetime
                callback(monthly, yearly, lifetime)
            }

            override fun onError(error: PurchasesError) {
                Log.e(TAG, "Error fetching offerings: ${error.message}")
                callback(null, null, null)
            }
        })
    }

    /**
     * Handle manual purchase for a specific package.
     */
    fun purchasePackage(activity: Activity, packageToPurchase: Package, onComplete: (Boolean, String?) -> Unit) {
        Purchases.sharedInstance.purchase(
            PurchaseParams.Builder(activity, packageToPurchase).build(),
            object : PurchaseCallback {
                override fun onCompleted(storeTransaction: StoreTransaction, customerInfo: CustomerInfo) {
                    val isActive = customerInfo.entitlements[ENTITLEMENT_PRO]?.isActive == true
                    onComplete(isActive, null)
                }

                override fun onError(error: PurchasesError, userCancelled: Boolean) {
                    if (!userCancelled) {
                        Log.e(TAG, "Purchase error: ${error.message}")
                        onComplete(false, error.message)
                    } else {
                        onComplete(false, "Cancelled")
                    }
                }
            }
        )
    }
}
