package com.olyoxpvt.OlyoxDriverApp

import android.media.MediaPlayer
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class PlayerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaPlayer: MediaPlayer? = null
    private val TAG = "🎧 PlayerModule"

    override fun getName(): String {
        return "PlayerModule"
    }

    // 🔊 Play sound dynamically by name
    @ReactMethod
    fun playSound(soundName: String, promise: Promise) {
        try {
            // Stop any currently playing sound
            stopSound()

            Log.d(TAG, "Requested to play sound: $soundName")

            // Try to find requested sound
            var resId = reactContext.resources.getIdentifier(
                soundName,
                "raw",
                reactContext.packageName
            )

            // If not found, fallback to default
            if (resId == 0) {
                Log.w(TAG, "⚠️ Sound '$soundName' not found — playing default 'sound.mp3'")
                resId = reactContext.resources.getIdentifier(
                    "sound",
                    "raw",
                    reactContext.packageName
                )

                if (resId == 0) {
                    val msg = "❌ Default sound 'sound.mp3' also not found in /res/raw/"
                    Log.e(TAG, msg)
                    promise.reject("NOT_FOUND", msg)
                    return
                }
            }

            // Create and play sound
            mediaPlayer = MediaPlayer.create(reactContext, resId)
            mediaPlayer?.isLooping = false

            mediaPlayer?.setOnCompletionListener {
                Log.d(TAG, "✅ Sound playback complete.")
                it.release()
                mediaPlayer = null
            }

            mediaPlayer?.start()
            Log.i(TAG, "🎵 Now playing: $soundName")

            promise.resolve("🎵 Playing sound: $soundName")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error while playing sound: ${e.message}", e)
            promise.reject("PLAY_ERROR", e.message)
        }
    }

    // 🛑 Stop sound
    @ReactMethod
    fun stopSound(promise: Promise? = null) {
        try {
            if (mediaPlayer != null) {
                Log.d(TAG, "Stopping currently playing sound.")
                mediaPlayer?.let {
                    if (it.isPlaying) {
                        it.stop()
                    }
                    it.release()
                }
                mediaPlayer = null
                promise?.resolve("🛑 Sound stopped")
            } else {
                Log.d(TAG, "No active sound to stop.")
                promise?.resolve("ℹ️ No sound playing currently.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error while stopping sound: ${e.message}", e)
            promise?.reject("STOP_ERROR", e.message)
        }
    }
}
