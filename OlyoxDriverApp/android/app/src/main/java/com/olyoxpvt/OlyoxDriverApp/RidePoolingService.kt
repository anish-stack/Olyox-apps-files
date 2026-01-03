package com.olyoxpvt.OlyoxDriverApp

import android.app.*
import android.content.*
import android.media.MediaPlayer
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import okhttp3.*
import org.json.JSONObject

class RidePoolingService : Service() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var isRunning = false
    private var riderId: String? = null
    private var baseUrl: String? = null
    private val client = OkHttpClient()

    private var currentRideId: String? = null
    private var notifiedRideIds = mutableSetOf<String>() // Track notified rides
    private var mediaPlayer: MediaPlayer? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        riderId = intent?.getStringExtra("riderId")
        baseUrl = intent?.getStringExtra("baseUrl") ?: "https://www.appv2.olyox.com"

        Log.d("RidePoolingService", "🚀 Starting pooling service for riderId=$riderId on $baseUrl")

        startForegroundService()
        startPolling()

        return START_STICKY
    }

    private fun startForegroundService() {
        val channelId = "olyox_pooling_channel"
        val channelName = "Olyox Pooling Service"

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
            notificationManager.createNotificationChannel(channel)
        }

        val messages = listOf(
            "Stay ready! A new earning opportunity is on its way 💰",
            "Connecting you to nearby riders...",
            "Zooming around to find your next passenger 🚗💨"
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Olyox Driver")
            .setContentText(messages.random())
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()

        startForeground(1, notification)
    }

    private fun startPolling() {
        if (isRunning || riderId.isNullOrEmpty()) {
            Log.d("RidePoolingService", "⚠️ Polling not started: either already running or riderId is null")
            return
        }

        isRunning = true

        scope.launch {
            while (isRunning) {
                try {
                    val url = "$baseUrl/api/v1/new/pooling-rides-for-rider/$riderId"
                    Log.d("RidePoolingService", "🌐 Polling URL: $url")

                    val request = Request.Builder().url(url).build()
                    val response = client.newCall(request).execute()

                    response.use {
                        if (!it.isSuccessful) {
                            Log.d("RidePoolingService", "❌ Polling failed: ${it.code}")
                            delay(2000)
                            return@use
                        }

                        val responseBody = it.body?.string()
                        Log.d("RidePoolingService", "📦 API response: $responseBody")

                        if (!responseBody.isNullOrEmpty()) {
                            handleApiResponse(responseBody)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("RidePoolingService", "🔥 Error during polling: ${e.message}")
                }

                delay(1000) // Poll every 1 second
            }
        }
    }

    private fun handleApiResponse(responseBody: String) {
        try {
            val json = JSONObject(responseBody)
            val success = json.optBoolean("success", false)
            val dataArray = json.optJSONArray("data")

            if (success && dataArray != null && dataArray.length() > 0) {
                val ride = dataArray.optJSONObject(0) ?: return
                val rideId = ride.optString("_id", "")
                val pickupAddress = ride.optString("pickup_address", "")
                val dropAddress = ride.optString("drop_address", "")

                if (rideId.isNotEmpty() && pickupAddress.isNotEmpty() && dropAddress.isNotEmpty()) {
                    // Check if we've already notified for this ride
                    if (notifiedRideIds.contains(rideId)) {
                        Log.d("RidePoolingService", "🔕 Ride $rideId already notified, skipping")
                        return
                    }

                    // Check ride status before notifying (launch in coroutine scope)
                    scope.launch {
                        checkRideStatusAndNotify(rideId, pickupAddress, dropAddress)
                    }
                }
            } else {
                Log.d("RidePoolingService", "🚫 No valid rides found — clearing all notifications and stopping sound")
                clearAllNotifications()
                stopAlertSound()
                currentRideId = null
                notifiedRideIds.clear() // Reset notified rides when no rides available
            }
        } catch (e: Exception) {
            Log.e("RidePoolingService", "⚠️ Error parsing API response: ${e.message}")
        }
    }

    private suspend fun checkRideStatusAndNotify(rideId: String, pickup: String, drop: String) {
        try {
            val statusUrl = "$baseUrl/rider-light/$rideId"
            Log.d("RidePoolingService", "🔍 Checking ride status: $statusUrl")

            val request = Request.Builder().url(statusUrl).build()
            val response = client.newCall(request).execute()

            response.use {
                if (!it.isSuccessful) {
                    Log.e("RidePoolingService", "❌ Status check failed: ${it.code}")
                    return
                }

                val statusBody = it.body?.string()
                if (statusBody.isNullOrEmpty()) {
                    Log.e("RidePoolingService", "❌ Empty status response")
                    return
                }

                Log.d("RidePoolingService", "📋 Status response: $statusBody")

                val statusJson = JSONObject(statusBody)
                val statusSuccess = statusJson.optBoolean("success", false)

                if (!statusSuccess) {
                    Log.e("RidePoolingService", "❌ Status API returned success=false")
                    return
                }

                val data = statusJson.optJSONObject("data")
                if (data == null) {
                    Log.e("RidePoolingService", "❌ No data in status response")
                    return
                }

                val rideStatus = data.optString("ride_status", "").lowercase()
                Log.d("RidePoolingService", "📊 Ride status: $rideStatus")

                // Only show notification and play sound if status is "searching" or "pending"
                if (rideStatus == "searching" || rideStatus == "pending") {
                    currentRideId = rideId
                    notifiedRideIds.add(rideId) // Mark as notified
                    
                    Log.d("RidePoolingService", "✅ Valid ride status ($rideStatus) - showing notification")
                    
                    withContext(Dispatchers.Main) {
                        showRideFoundNotification(pickup, drop, rideId)
                        playAlertSound()
                        openApp()
                    }
                } else {
                    Log.d("RidePoolingService", "🚫 Ride status is '$rideStatus' - not notifying")
                    
                    // Clear notifications for this specific ride if status changed
                    clearNotificationForRide(rideId)
                    stopAlertSound()
                }
            }
        } catch (e: Exception) {
            Log.e("RidePoolingService", "❌ Error checking ride status: ${e.message}")
        }
    }

    /**
     * Clear all ride notifications
     */
    private fun clearAllNotifications() {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancelAll()
            Log.d("RidePoolingService", "🧹 All notifications cleared")
        } catch (e: Exception) {
            Log.e("RidePoolingService", "❌ Failed to clear notifications: ${e.message}")
        }
    }

    /**
     * Clear notification for specific ride
     */
    private fun clearNotificationForRide(rideId: String) {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val notificationId = rideId.hashCode()
            notificationManager.cancel(notificationId)
            Log.d("RidePoolingService", "🧹 Cleared notification for ride: $rideId")
        } catch (e: Exception) {
            Log.e("RidePoolingService", "❌ Failed to clear notification for ride $rideId: ${e.message}")
        }
    }

    private fun showRideFoundNotification(pickup: String, drop: String, rideId: String) {
        val channelId = "olyox_ride_alert"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Ride Alerts",
                NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle("🚖 New Pool Ride Found!")
            .setContentText("Pickup: $pickup → Drop: $drop")
            .setStyle(NotificationCompat.BigTextStyle().bigText("Pickup: $pickup\nDrop: $drop"))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()

        // Use unique notification ID based on rideId to prevent duplicate notifications
        val notificationId = rideId.hashCode()
        notificationManager.notify(notificationId, notification)
        
        Log.d("RidePoolingService", "📢 Notification displayed for ride: $rideId ($pickup → $drop)")
    }

    // 🔊 Play alert sound when ride found
    private fun playAlertSound() {
        try {
            stopAlertSound()
            val resId = resources.getIdentifier("sound", "raw", packageName)
            if (resId == 0) {
                Log.w("RidePoolingService", "⚠️ Default sound file sound.mp3 not found in /res/raw/")
                return
            }

            mediaPlayer = MediaPlayer.create(this, resId)
            mediaPlayer?.isLooping = true
            mediaPlayer?.start()
            Log.d("RidePoolingService", "🎵 Alert sound started")
        } catch (e: Exception) {
            Log.e("RidePoolingService", "❌ Failed to play sound: ${e.message}")
        }
    }

    // 🛑 Stop alert sound
    private fun stopAlertSound() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null
            Log.d("RidePoolingService", "🛑 Alert sound stopped")
        } catch (e: Exception) {
            Log.e("RidePoolingService", "❌ Failed to stop sound: ${e.message}")
        }
    }

    private fun openApp() {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            startActivity(launchIntent)
            Log.d("RidePoolingService", "🚘 App launched from background")
        } catch (e: Exception) {
            Log.e("RidePoolingService", "⚠️ Unable to open app: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        stopAlertSound()
        notifiedRideIds.clear()
        scope.cancel()
        Log.d("RidePoolingService", "🛑 Pooling service stopped")
    }
}