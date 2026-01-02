package com.olyoxpvt.OlyoxDriverApp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val prefs = context.getSharedPreferences("service_prefs", Context.MODE_PRIVATE)
            val riderId = prefs.getString("last_rider_id", null)
            val authToken = prefs.getString("last_auth_token", null)
            
            if (riderId != null && authToken != null) {
                val serviceIntent = Intent(context, RidePoolingService::class.java).apply {
                    putExtra("riderId", riderId)
                    putExtra("authToken", authToken)
                }
                context.startForegroundService(serviceIntent)
            }
        }
    }
}