package com.olyoxpvt.OlyoxDriverApp

import android.content.Intent
import com.facebook.react.bridge.*

class RideModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "RideModule"

    @ReactMethod
    fun startPoolingService(start: Boolean, riderId: String, baseUrl: String, promise: Promise) {
        val context = reactApplicationContext
        val serviceIntent = Intent(context, RidePoolingService::class.java).apply {
            putExtra("riderId", riderId)
            putExtra("baseUrl", baseUrl)
        }

        try {
            if (start) {
                context.startForegroundService(serviceIntent)
                promise.resolve("✅ Pooling service started with riderId=$riderId")
            } else {
                context.stopService(serviceIntent)
                promise.resolve("🛑 Pooling service stopped")
            }
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message)
        }
    }
}
