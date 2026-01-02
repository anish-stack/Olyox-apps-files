package com.olyoxpvt.OlyoxDriverApp

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Promise
class FloatingWidgetModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FloatingWidget"
    }

    /** Check if overlay permission is granted */
    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        try {
            val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(reactContext)
            } else true
            promise.resolve(granted)
        } catch (e: Exception) {
            promise.reject("ERROR_CHECKING_PERMISSION", e.message, e)
        }
    }

    /** Request overlay permission */
    @ReactMethod
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
            Toast.makeText(
                reactContext,
                "Please grant 'Draw over apps' permission",
                Toast.LENGTH_LONG
            ).show()

            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactContext.packageName}")
            )
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactContext.startActivity(intent)
        }
    }
    // Start without data
    @ReactMethod
    fun startWidget() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
            Toast.makeText(
                reactContext,
                "Please grant 'Draw over apps' permission",
                Toast.LENGTH_LONG
            ).show()

            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + reactContext.packageName)
            )
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactContext.startActivity(intent)
        } else {
            val intent = Intent(reactContext, FloatingWidgetService::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactContext.startService(intent)
        }
    }

    // Start with ride data passed as object
    @ReactMethod
    fun startWidgetWithData(data: ReadableMap) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
            Toast.makeText(
                reactContext,
                "Please grant 'Draw over apps' permission",
                Toast.LENGTH_LONG
            ).show()

            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + reactContext.packageName)
            )
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactContext.startActivity(intent)
        } else {
            val intent = Intent(reactContext, FloatingWidgetService::class.java)

            if (data.hasKey("pickup")) intent.putExtra("pickup_location", data.getString("pickup"))
            if (data.hasKey("vehicleType")) intent.putExtra("vehicleType", data.getString("vehicleType"))
            if (data.hasKey("drop")) intent.putExtra("drop_location", data.getString("drop"))
            if (data.hasKey("price")) intent.putExtra("price", data.getString("price"))
            if (data.hasKey("rideId")) intent.putExtra("ride_id", data.getString("rideId"))
            if (data.hasKey("distance_from_pickup")) intent.putExtra("distance_from_pickup", data.getString("distance_from_pickup"))
            if (data.hasKey("dropDistance")) intent.putExtra("drop_distance", data.getString("dropDistance"))
            if (data.hasKey("acceptUrl")) intent.putExtra("accept_api_url", data.getString("acceptUrl"))
            if (data.hasKey("rejectUrl")) intent.putExtra("reject_api_url", data.getString("rejectUrl"))
            if (data.hasKey("playSound")) intent.putExtra("play_sound", data.getBoolean("playSound"))

            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactContext.startService(intent)
        }
    }

    // Update widget data with object
    @ReactMethod
    fun updateWidgetData(data: ReadableMap) {
        FloatingWidgetService.updateRideData(
            pickup = data.getString("pickup") ?: "",
            vehicleType = data.getString("vehicleType") ?: "",
            drop = data.getString("drop") ?: "",
            priceValue = data.getString("price") ?: "",
            rideIdValue = data.getString("rideId") ?: "",
            acceptUrl = data.getString("acceptUrl") ?: "",
            rejectUrl = data.getString("rejectUrl") ?: "",
            playSound = data.getBoolean("playSound"),
            distanceFromPickupValue = data.getString("distance_from_pickup") ?: "",
            dropDistanceValue = data.getString("dropDistance") ?: ""
        )
    }

    @ReactMethod
    fun showPopup() {
        FloatingWidgetService.instance?.showPopup()
    }

    @ReactMethod
    fun hidePopup() {
        FloatingWidgetService.instance?.hidePopup()
    }

    @ReactMethod
    fun clearWidgetData() {
        FloatingWidgetService.instance?.clearRideData()
    }

    @ReactMethod
    fun stopSound() {
        FloatingWidgetService.instance?.stopNotificationSound()
    }

     @ReactMethod
    fun clearAlNotif() {
        FloatingWidgetService.instance?.clearAllNotifications()
    }

    @ReactMethod
    fun closeWidgetClearData() {
        FloatingWidgetService.instance?.let {
            it.hidePopup()
            it.clearRideData()
            it.stopNotificationSound()
        }
    }

    @ReactMethod
    fun stopWidget() {
        val intent = Intent(reactContext, FloatingWidgetService::class.java)
        reactContext.stopService(intent)
    }
}
