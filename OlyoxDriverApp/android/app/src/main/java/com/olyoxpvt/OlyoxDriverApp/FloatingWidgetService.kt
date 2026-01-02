package com.olyoxpvt.OlyoxDriverApp

import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.*
import android.view.View.*
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import android.widget.ProgressBar
import java.util.concurrent.Executor
import java.util.concurrent.Executors
import org.json.JSONObject
import org.json.JSONException
import java.net.HttpURLConnection
import java.net.URL
import java.io.OutputStreamWriter
import com.olyoxpvt.OlyoxDriverApp.R

class FloatingWidgetService : Service() {

    companion object {
        private const val TAG = "FloatingWidgetService"
        var instance: FloatingWidgetService? = null
        
        fun updateData(
            pickup: String,
            vehicleType: String,
            drop: String,
            priceValue: String,
            playSound: Boolean = false,
            rideId: String = "",
            acceptApiUrl: String = "",
            rejectApiUrl: String = "",
            distanceFromPickupValue: String = "",
            dropDistanceValue: String = "",
            statusUrl: String = ""
        ) {
            Log.d(TAG, "updateData called - pickup: '$pickup', vehicleType: '$vehicleType', drop: '$drop', price: '$priceValue'")
            instance?.let {
                it.pickupLocation = pickup
                it.vehicleTypeString = vehicleType
                it.dropLocation = drop
                it.price = priceValue
                it.shouldPlaySound = playSound
                it.rideId = rideId
                it.acceptApiUrl = acceptApiUrl
                it.rejectApiUrl = rejectApiUrl
                it.distanceFromPickupValue = distanceFromPickupValue
                it.dropDistanceValue = dropDistanceValue
                it.statusApiUrl = statusUrl

                Log.d(TAG, "hasRideData(): ${it.hasRideData()}")
                if (it.hasRideData()) {
                    Log.d(TAG, "Showing popup with valid ride data")
                    it.showPopup()
                    if (playSound) {
                        Log.d(TAG, "Playing notification sound")
                        it.playNotificationSound()
                    }
                } else {
                    Log.d(TAG, "Hiding popup - no valid ride data")
                    it.hidePopup()
                }
            } ?: Log.e(TAG, "FloatingWidgetService instance is null")
        }

        fun updateRideData(
            pickup: String,
            vehicleType: String,
            drop: String,
            priceValue: String,
            rideIdValue: String,
            acceptUrl: String,
            rejectUrl: String,
            playSound: Boolean,
            distanceFromPickupValue: String = "",
            dropDistanceValue: String = "",
            statusUrl: String = ""
        ) {
            Log.d(TAG, "updateRideData called - pickup: '$pickup', vehicleType: '$vehicleType', drop: '$drop', price: '$priceValue', rideId: '$rideIdValue'")
            instance?.let {
                it.pickupLocation = pickup
                it.vehicleTypeString = vehicleType
                it.dropLocation = drop
                it.price = priceValue
                it.rideId = rideIdValue
                it.acceptApiUrl = acceptUrl
                it.rejectApiUrl = rejectUrl
                it.shouldPlaySound = playSound
                it.distanceFromPickupValue = distanceFromPickupValue
                it.dropDistanceValue = dropDistanceValue
                it.statusApiUrl = if (statusUrl.isNotEmpty()) statusUrl else "https://www.appv2.olyox.com/api/v1/new/status/$rideIdValue"
                
                Log.d(TAG, "hasRideData(): ${it.hasRideData()}")
                if (it.hasRideData()) {
                    Log.d(TAG, "Showing popup with valid ride data")
                    it.showPopup()
                    if (playSound) {
                        Log.d(TAG, "Playing notification sound")
                        it.playNotificationSound()
                    }
                } else {
                    Log.d(TAG, "Hiding popup - no valid ride data")
                    it.hidePopup()
                }
            } ?: Log.e(TAG, "FloatingWidgetService instance is null")
        }
    }

    private lateinit var windowManager: WindowManager
    private lateinit var floatingIconView: View
    private var floatingPopupView: View? = null
    private var isPopupVisible = false
    
    


    private var pickupLocation = ""
    private var vehicleTypeString = ""
    private var dropLocation = ""
    private var price = ""
    private var rideId = ""
    private var acceptApiUrl = ""
    private var rejectApiUrl = ""
    private var statusApiUrl = ""
    private var shouldPlaySound = false
    private var distanceFromPickupValue = ""
    private var dropDistanceValue = ""
    
    private lateinit var iconParams: WindowManager.LayoutParams
    private lateinit var popupParams: WindowManager.LayoutParams
    private var mediaPlayer: MediaPlayer? = null
    private lateinit var executor: Executor
    
    private val handler = Handler(Looper.getMainLooper())
    
    // Auto-close timer variables
    private var autoCloseRunnable: Runnable? = null
    private val AUTO_CLOSE_DELAY = 20000L // 20 seconds
    
    // Status polling variables
    private var statusPollingRunnable: Runnable? = null
    private val STATUS_POLLING_INTERVAL = 3000L // 3 seconds
    private var isPollingActive = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")
        instance = this
        executor = Executors.newSingleThreadExecutor()
        setupFloatingIcon()
        setupFloatingPopup()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand called")
        intent?.let {
            pickupLocation = it.getStringExtra("pickup_location") ?: ""
            vehicleTypeString = it.getStringExtra("vehicleType") ?: ""
            dropLocation = it.getStringExtra("drop_location") ?: ""
            price = it.getStringExtra("price") ?: ""
            rideId = it.getStringExtra("ride_id") ?: ""
            acceptApiUrl = it.getStringExtra("accept_api_url") ?: ""
            rejectApiUrl = it.getStringExtra("reject_api_url") ?: ""
            shouldPlaySound = it.getBooleanExtra("play_sound", false)
            distanceFromPickupValue = it.getStringExtra("distance_from_pickup") ?: ""
            dropDistanceValue = it.getStringExtra("drop_distance") ?: ""
            statusApiUrl = it.getStringExtra("status_api_url") ?: ""
            
            // Build status URL if not provided
            if (statusApiUrl.isEmpty() && rideId.isNotEmpty()) {
                statusApiUrl = "https://www.appv2.olyox.com/api/v1/new/status/$rideId"
            }
            
            Log.d(TAG, "Intent data - pickup: '$pickupLocation', vehicleType: '$vehicleTypeString', drop: '$dropLocation', price: '$price', rideId: '$rideId'")
            
            if (hasRideData()) {
                launchMainActivity()
                Log.d(TAG, "Valid ride data found, showing popup with delay")
                handler.postDelayed({
                
                    if (shouldPlaySound) {
                        playNotificationSound()
                    }
                }, 500)
            } else {
                Log.d(TAG, "No valid ride data found")
            }
        } ?: Log.d(TAG, "No intent data provided")
        
        return START_STICKY
    }

    private fun setupFloatingIcon() {
        Log.d(TAG, "Setting up floating icon")
        floatingIconView = LayoutInflater.from(this).inflate(R.layout.floating_widget_icon, null)

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            WindowManager.LayoutParams.TYPE_PHONE

        iconParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = 200
        }

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        windowManager.addView(floatingIconView, iconParams)
        Log.d(TAG, "Floating icon added to window manager")

        val iconView = floatingIconView.findViewById<ImageView>(R.id.floating_icon)

        iconView.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var isDragging = false
            private val dragThreshold = 15f
            private var startTime = 0L

            override fun onTouch(v: View?, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        Log.d(TAG, "Touch DOWN - Starting drag detection")
                        initialX = iconParams.x
                        initialY = iconParams.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        isDragging = false
                        startTime = System.currentTimeMillis()
                        Log.d(TAG, "Initial position: x=$initialX, y=$initialY")
                        return true
                    }

                    MotionEvent.ACTION_MOVE -> {
                        val currentX = event.rawX
                        val currentY = event.rawY
                        val deltaX = currentX - initialTouchX
                        val deltaY = currentY - initialTouchY
                        val distance = Math.sqrt((deltaX * deltaX + deltaY * deltaY).toDouble()).toFloat()

                        if (distance > dragThreshold && !isDragging) {
                            isDragging = true
                            Log.d(TAG, "DRAG STARTED - distance: $distance")
                        }

                        if (isDragging) {
                            val newX = (initialX + deltaX).toInt()
                            val newY = (initialY + deltaY).toInt()
                            
                            val displayMetrics = resources.displayMetrics
                            val screenWidth = displayMetrics.widthPixels
                            val screenHeight = displayMetrics.heightPixels
                            val iconWidth = floatingIconView.width
                            val iconHeight = floatingIconView.height

                            iconParams.x = when {
                                newX < 0 -> 0
                                newX > screenWidth - iconWidth -> screenWidth - iconWidth
                                else -> newX
                            }
                            
                            iconParams.y = when {
                                newY < 0 -> 0
                                newY > screenHeight - iconHeight -> screenHeight - iconHeight
                                else -> newY
                            }

                            try {
                                windowManager.updateViewLayout(floatingIconView, iconParams)
                            } catch (e: Exception) {
                                Log.e(TAG, "Error updating icon position", e)
                            }
                        }
                        return true
                    }

                    MotionEvent.ACTION_UP -> {
                        val endTime = System.currentTimeMillis()
                        val duration = endTime - startTime
                        val finalX = event.rawX
                        val finalY = event.rawY
                        val totalDistance = Math.sqrt(
                            ((finalX - initialTouchX) * (finalX - initialTouchX) + 
                             (finalY - initialTouchY) * (finalY - initialTouchY)).toDouble()
                        ).toFloat()
                        
                        Log.d(TAG, "Touch UP - isDragging: $isDragging, duration: ${duration}ms, totalDistance: $totalDistance")
                        
                        val wasClick = !isDragging && duration < 300 && totalDistance < dragThreshold
                        
                        if (wasClick) {
                            Log.d(TAG, "CLICK detected - performing click action")
                            handler.post {
                                if (hasRideData()) {
                                    Log.d(TAG, "Has ride data - toggling popup")
                                    togglePopup()
                                } else {
                                    Log.d(TAG, "No ride data - launching main activity")
                                    launchMainActivity()
                                }
                            }
                        } else if (isDragging) {
                            Log.d(TAG, "DRAG completed")
                            snapToEdge()
                        }
                        
                        isDragging = false
                        return true
                    }

                    MotionEvent.ACTION_CANCEL -> {
                        Log.d(TAG, "Touch CANCEL")
                        isDragging = false
                        return true
                    }
                }
                return false
            }
        })
        
        Log.d(TAG, "Floating icon setup completed with dragging enabled")
    }

    private fun snapToEdge() {
        try {
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val centerX = screenWidth / 2
            
            val targetX = if (iconParams.x < centerX) {
                Log.d(TAG, "Snapping to LEFT edge")
                0
            } else {
                Log.d(TAG, "Snapping to RIGHT edge")
                screenWidth - floatingIconView.width
            }
            
            val animator = android.animation.ValueAnimator.ofInt(iconParams.x, targetX)
            animator.duration = 300
            animator.addUpdateListener { animation ->
                iconParams.x = animation.animatedValue as Int
                try {
                    windowManager.updateViewLayout(floatingIconView, iconParams)
                } catch (e: Exception) {
                    Log.e(TAG, "Error during snap animation", e)
                }
            }
            animator.start()
        } catch (e: Exception) {
            Log.e(TAG, "Error snapping to edge", e)
        }
    }

    private fun setupFloatingPopup() {
        Log.d(TAG, "Setting up floating popup")
        floatingPopupView = LayoutInflater.from(this).inflate(R.layout.floating_widget_popup, null)

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            WindowManager.LayoutParams.TYPE_PHONE

        popupParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
            width = (resources.displayMetrics.widthPixels * 0.95).toInt()
        }

        floatingPopupView?.findViewById<ImageView>(R.id.close_popup)?.setOnClickListener {
            Log.d(TAG, "Close popup clicked")
            hidePopup()
        }

        floatingPopupView?.findViewById<TextView>(R.id.accept_ride)?.setOnClickListener {
            Log.d(TAG, "Accept ride clicked")
            callAcceptApi()
        }
        
        floatingPopupView?.findViewById<TextView>(R.id.decline_ride)?.setOnClickListener {
            Log.d(TAG, "Decline ride clicked")
            callRejectApi()
        }
        Log.d(TAG, "Popup setup completed")
    }

    private fun togglePopup() {
        Log.d(TAG, "togglePopup called - isPopupVisible: $isPopupVisible")
        if (isPopupVisible) {
            hidePopup()
        } else {
            showPopup()
        }
    }

 fun showPopup() {
        Log.d(TAG, "showPopup called - isPopupVisible: $isPopupVisible, hasRideData: ${hasRideData()}")
        if (!isPopupVisible && floatingPopupView != null && hasRideData()) {
            updatePopupData()
            try {
                windowManager.addView(floatingPopupView, popupParams)
                isPopupVisible = true
                Log.d(TAG, "Popup shown successfully")
                
                startAutoCloseTimer()
                startStatusPolling()
                
            } catch (e: Exception) {
                Log.e(TAG, "Error showing popup", e)
            }
        } else {
            Log.d(TAG, "Popup not shown - already visible or no valid ride data")
        }
    }

fun hidePopup() {
        Log.d(TAG, "hidePopup called - isPopupVisible: $isPopupVisible")
        if (isPopupVisible && floatingPopupView != null) {
            try {
                windowManager.removeView(floatingPopupView)
                isPopupVisible = false
                stopNotificationSound()
                stopAutoCloseTimer()
                stopStatusPolling()
                clearAllNotifications()
                Log.d(TAG, "Popup hidden successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Error hiding popup", e)
            }
        }
    }

 fun startAutoCloseTimer() {
        Log.d(TAG, "Starting auto-close timer for ${AUTO_CLOSE_DELAY}ms")
        stopAutoCloseTimer()
        
        autoCloseRunnable = Runnable {
            Log.d(TAG, "Auto-close timer expired")
            if (isPopupVisible) {
                showToast("Ride request expired - automatically declined")
                callRejectApi()
            }
        }
        
        handler.postDelayed(autoCloseRunnable!!, AUTO_CLOSE_DELAY)
    }

fun stopAutoCloseTimer() {
        autoCloseRunnable?.let {
            handler.removeCallbacks(it)
            autoCloseRunnable = null
            Log.d(TAG, "Auto-close timer stopped")
        }
    }

    fun startStatusPolling() {
        if (rideId.isEmpty()) {
            Log.w(TAG, "Cannot start polling - no ride ID")
            return
        }

        if (statusApiUrl.isEmpty()) {
            statusApiUrl = "https://www.appv2.olyox.com/api/v1/new/status/$rideId"
        }

        Log.d(TAG, "Starting status polling for ride $rideId at URL: $statusApiUrl")
        stopStatusPolling()
        
        isPollingActive = true
        
        statusPollingRunnable = object : Runnable {
            override fun run() {
                if (!isPollingActive || !isPopupVisible) {
                    Log.d(TAG, "Stopping polling - active: $isPollingActive, visible: $isPopupVisible")
                    return
                }

                checkRideStatus()
                handler.postDelayed(this, STATUS_POLLING_INTERVAL)
            }
        }
        
        handler.postDelayed(statusPollingRunnable!!, 1000)
    }

 fun stopStatusPolling() {
        statusPollingRunnable?.let {
            handler.removeCallbacks(it)
            statusPollingRunnable = null
            isPollingActive = false
            Log.d(TAG, "Status polling stopped")
        }
    }

  fun checkRideStatus() {
        if (statusApiUrl.isEmpty()) {
            Log.w(TAG, "Status API URL is empty")
            return
        }

        executor.execute {
            try {
                Log.d(TAG, "Checking ride status: $statusApiUrl")
                
                val connection = URL(statusApiUrl).openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                
                val responseCode = connection.responseCode
                Log.d(TAG, "Status check response code: $responseCode")
                
                if (responseCode in 200..299) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    Log.d(TAG, "Status response: $response")
                    parseAndHandleStatus(response)
                } else {
                    Log.w(TAG, "Non-success response code: $responseCode")
                }
                
                connection.disconnect()
                
            } catch (e: Exception) {
                Log.e(TAG, "Error checking ride status", e)
            }
        }
    }

    fun parseAndHandleStatus(jsonResponse: String) {
        try {
            val jsonObject = JSONObject(jsonResponse)
            val status = jsonObject.optString("status", "")
            
            Log.d(TAG, "Parsed ride status: $status")
            
            val rideDetails = jsonObject.optJSONObject("rideDetails")
            val rideStatus = rideDetails?.optString("ride_status", "") ?: status
            
            Log.d(TAG, "Ride status from details: $rideStatus")
            
            when (rideStatus.lowercase()) {
                "cancelled" -> {
                    Log.d(TAG, "Ride is cancelled - closing popup")
                    val cancelledBy = rideDetails?.optString("cancelled_by", "system")
                    val reason = rideDetails?.optString("cancellation_reason", "Ride cancelled")
                    
                    handler.post {
                        showToast("Ride cancelled by $cancelledBy")
                        hidePopup()
                        clearRideData()
                    }
                }
                "driver_assigned" -> {
                    Log.d(TAG, "Driver assigned - closing popup")
                    handler.post {
                        showToast("Driver assigned! Opening app...")
                        hidePopup()
                        clearRideData()
                        launchMainActivity()
                    }
                }
                "driver_arrived" -> {
                    Log.d(TAG, "Driver arrived - closing popup")
                    handler.post {
                        showToast("Driver has arrived!")
                        hidePopup()
                        clearRideData()
                        launchMainActivity()
                    }
                }
                "in_progress", "completed" -> {
                    Log.d(TAG, "Ride is $rideStatus - closing popup")
                    handler.post {
                        hidePopup()
                        clearRideData()
                    }
                }
                "pending", "searching" -> {
                    Log.d(TAG, "Ride is $rideStatus - continuing to show popup")
                }
                else -> {
                    Log.d(TAG, "Unknown status: $rideStatus")
                }
            }
            
        } catch (e: JSONException) {
            Log.e(TAG, "Error parsing status JSON", e)
        }
    }

 fun clearAllNotifications() {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancelAll()
            Log.d(TAG, "All notifications cleared")
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing notifications", e)
        }
    }

    fun updatePopupData() {
        Log.d(TAG, "Updating popup data - pickup: '$pickupLocation', drop: '$dropLocation', price: '$price', vehicleType: '$vehicleTypeString'")
        floatingPopupView?.let { popup ->
            popup.findViewById<TextView>(R.id.pickup_location)?.text = 
                if (pickupLocation.isNotEmpty()) pickupLocation else "No pickup location"
            popup.findViewById<TextView>(R.id.drop_location)?.text = 
                if (dropLocation.isNotEmpty()) dropLocation else "No drop location"
            popup.findViewById<TextView>(R.id.ride_price)?.text = 
                if (price.isNotEmpty()) price else "Rs.0"
            popup.findViewById<TextView>(R.id.vehicleType)?.text =
                if (vehicleTypeString.isNotEmpty()) "Ride For Vehicle: $vehicleTypeString"
                else "Ride For Vehicle: Unknown"
            
            popup.findViewById<TextView>(R.id.distance_from_pickup)?.text = 
                if (distanceFromPickupValue.isNotEmpty()) distanceFromPickupValue else "N/A"
            popup.findViewById<TextView>(R.id.drop_distance)?.text = 
                if (dropDistanceValue.isNotEmpty()) dropDistanceValue else "N/A"
        }
    }

    fun hasRideData(): Boolean {
        val hasData = pickupLocation.isNotEmpty() && pickupLocation.trim().isNotEmpty() &&
                      dropLocation.isNotEmpty() && dropLocation.trim().isNotEmpty() &&
                      price.isNotEmpty() && price.trim().isNotEmpty()
        Log.d(TAG, "hasRideData() returning: $hasData")
        return hasData
    }
    
   fun clearRideData() {
        Log.d(TAG, "Clearing ride data")
        pickupLocation = ""
        vehicleTypeString = ""
        dropLocation = ""
        price = ""
        rideId = ""
        acceptApiUrl = ""
        rejectApiUrl = ""
        statusApiUrl = ""
        shouldPlaySound = false
        distanceFromPickupValue = ""
        dropDistanceValue = ""
        stopNotificationSound()
        stopAutoCloseTimer()
        stopStatusPolling()
        clearAllNotifications()
    }
    
    private fun setAcceptButtonLoading(isLoading: Boolean) {
        Log.d(TAG, "Setting accept button loading: $isLoading")
        floatingPopupView?.let { popup ->
            val acceptButton = popup.findViewById<TextView>(R.id.accept_ride)
            val acceptLoader = popup.findViewById<ProgressBar>(R.id.accept_loader)
            val declineButton = popup.findViewById<TextView>(R.id.decline_ride)
            
            if (isLoading) {
                acceptButton?.text = ""
                acceptButton?.isEnabled = false
                acceptLoader?.visibility = VISIBLE
                declineButton?.isEnabled = false
                declineButton?.alpha = 0.5f
            } else {
                acceptButton?.text = "Accept"
                acceptButton?.isEnabled = true
                acceptLoader?.visibility = GONE
                declineButton?.isEnabled = true
                declineButton?.alpha = 1.0f
            }
        }
    }
    
    private fun setDeclineButtonLoading(isLoading: Boolean) {
        Log.d(TAG, "Setting decline button loading: $isLoading")
        floatingPopupView?.let { popup ->
            val declineButton = popup.findViewById<TextView>(R.id.decline_ride)
            val declineLoader = popup.findViewById<ProgressBar>(R.id.decline_loader)
            val acceptButton = popup.findViewById<TextView>(R.id.accept_ride)
            
            if (isLoading) {
                declineButton?.text = ""
                declineButton?.isEnabled = false
                declineLoader?.visibility = VISIBLE
                acceptButton?.isEnabled = false
                acceptButton?.alpha = 0.5f
            } else {
                declineButton?.text = "Decline"
                declineButton?.isEnabled = true
                declineLoader?.visibility = GONE
                acceptButton?.isEnabled = true
                acceptButton?.alpha = 1.0f
            }
        }
    }
    
    private fun callAcceptApi() {
        Log.d(TAG, "callAcceptApi called - acceptApiUrl: '$acceptApiUrl', rideId: '$rideId'")
        stopAutoCloseTimer()
        stopStatusPolling()
        
        if (acceptApiUrl.isNotEmpty()) {
            setAcceptButtonLoading(true)
            
            executor.execute {
                try {
                    val jsonObject = JSONObject()
                    jsonObject.put("ride_id", rideId)
                    jsonObject.put("status", "accepted")
                    jsonObject.put("driver_action", "accept")
                    
                    Log.d(TAG, "Making accept API call with data: ${jsonObject.toString()}")
                    makeApiCall(acceptApiUrl, jsonObject) { success ->
                        Log.d(TAG, "Accept API call completed - success: $success")
                        handler.post {
                            setAcceptButtonLoading(false)
                            
                            if (success) {
                                showToast("Ride accepted successfully!")
                                 val payloadJson = JSONObject().apply {
        put("rideId", rideId)
        put("status", "accepted")
        put("driver_action", "accept")
        put("time", System.currentTimeMillis())
    }

 

                                launchMainActivity()
                                hidePopup()
                                clearRideData()
                            } else {
                                showToast("Failed to accept ride. Please try again.")
                                startAutoCloseTimer()
                                startStatusPolling()
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error in accept API call", e)
                    handler.post {
                        setAcceptButtonLoading(false)
                        showToast("Error accepting ride. Please try again.")
                        startAutoCloseTimer()
                        startStatusPolling()
                    }
                }
            }
        } else {
            Log.d(TAG, "No accept API URL, just launching app")
            showToast("Ride accepted!")
            launchMainActivity()
            hidePopup()
        }
    }
    
    private fun callRejectApi() {
        Log.d(TAG, "callRejectApi called - rejectApiUrl: '$rejectApiUrl', rideId: '$rideId'")
        stopAutoCloseTimer()
        stopStatusPolling()
        
        if (rejectApiUrl.isNotEmpty()) {
            setDeclineButtonLoading(true)
            
            executor.execute {
                try {
                    val jsonObject = JSONObject()
                    jsonObject.put("ride_id", rideId)
                    jsonObject.put("status", "rejected")
                    jsonObject.put("driver_action", "reject")
                    
                    Log.d(TAG, "Making reject API call with data: ${jsonObject.toString()}")
                    makeApiCall(rejectApiUrl, jsonObject) { success ->
                        Log.d(TAG, "Reject API call completed - success: $success")
                        handler.post {
                            setDeclineButtonLoading(false)
                            
                            if (success) {
                                showToast("Ride declined successfully!")
                            } else {
                                showToast("Failed to decline ride, but closing popup.")
                            }
                            
                            hidePopup()
                            clearRideData()
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error in reject API call", e)
                    handler.post {
                        setDeclineButtonLoading(false)
                        showToast("Error declining ride, but closing popup.")
                        hidePopup()
                        clearRideData()
                    }
                }
            }
        } else {
            Log.d(TAG, "No reject API URL, just hiding popup")
            showToast("Ride declined!")
            hidePopup()
            clearRideData()
        }
    }
    
    private fun showToast(message: String) {
        Log.d(TAG, "Showing toast: $message")
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    private fun makeApiCall(url: String, jsonData: JSONObject, callback: (Boolean) -> Unit) {
        Log.d(TAG, "makeApiCall started - URL: $url")
        try {
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            
            val outputWriter = OutputStreamWriter(connection.outputStream)
            outputWriter.write(jsonData.toString())
            outputWriter.flush()
            outputWriter.close()
            
            val responseCode = connection.responseCode
            val success = responseCode in 200..299
            
            Log.d(TAG, "API call completed - responseCode: $responseCode, success: $success")
            connection.disconnect()
            callback(success)
            
        } catch (e: Exception) {
            Log.e(TAG, "API call failed", e)
            callback(false)
        }
    }

    private fun playNotificationSound() {
        Log.d(TAG, "Playing notification sound")
        try {
            stopNotificationSound()
            
            mediaPlayer = MediaPlayer.create(this, R.raw.sound)
            mediaPlayer?.isLooping = true
            mediaPlayer?.start()
            Log.d(TAG, "Custom notification sound started")
            
            handler.postDelayed({
                stopNotificationSound()
            }, 30000)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error playing custom sound, trying fallback", e)
            try {
                val notification: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                mediaPlayer = MediaPlayer.create(this, notification)
                mediaPlayer?.isLooping = true
                mediaPlayer?.start()
                Log.d(TAG, "Fallback notification sound started")
            } catch (fallbackError: Exception) {
                Log.e(TAG, "Both custom and fallback sounds failed", fallbackError)
            }
        }
    }
    
   fun stopNotificationSound() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                    Log.d(TAG, "Notification sound stopped")
                }
                it.release()
            }
            mediaPlayer = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping notification sound", e)
        }
    }

    private fun launchMainActivity() {
        Log.d(TAG, "Launching main activity")
        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        startActivity(intent)
        stopNotificationSound()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
        instance = null
        stopNotificationSound()
        stopAutoCloseTimer()
        stopStatusPolling()
        clearAllNotifications()
        
        if (::floatingIconView.isInitialized) {
            try {
                windowManager.removeView(floatingIconView)
                Log.d(TAG, "Floating icon removed")
            } catch (e: Exception) {
                Log.e(TAG, "Error removing floating icon", e)
            }
        }
        
        if (isPopupVisible && floatingPopupView != null) {
            try {
                windowManager.removeView(floatingPopupView)
                Log.d(TAG, "Floating popup removed")
            } catch (e: Exception) {
                Log.e(TAG, "Error removing floating popup", e)
            }
        }
        
        executor.let {
            if (it is java.util.concurrent.ExecutorService) {
                it.shutdown()
                Log.d(TAG, "Executor shutdown")
            }
        }
    }
}