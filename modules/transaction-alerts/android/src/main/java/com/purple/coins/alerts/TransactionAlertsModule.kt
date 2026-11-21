package com.purple.coins.alerts

import android.Manifest
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TransactionAlertsModule : Module() {
	override fun definition() = ModuleDefinition {
		Name("TransactionAlerts")

		Function("isAccessGranted") {
			val context = appContext.reactContext ?: return@Function false
			val enabled = Settings.Secure.getString(
				context.contentResolver,
				"enabled_notification_listeners",
			)
			enabled?.contains(context.packageName) == true
		}

		Function("openAccessSettings") {
			val context = appContext.reactContext ?: return@Function false
			context.startActivity(
				Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
					.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
			)
			true
		}

		Function("drainAlerts") {
			val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any>>()
			AlertQueue.drain(context)
		}

		Function("scheduleValidationChecks") {
			val context = appContext.reactContext ?: return@Function false
			ValidationReminder.schedule(context)
			true
		}

		Function("runValidationCheck") {
			val context = appContext.reactContext ?: return@Function false
			ValidationReminder.runCheck(context)
			true
		}

		Function("areNotificationsEnabled") {
			val context = appContext.reactContext ?: return@Function false
			NotificationManagerCompat.from(context).areNotificationsEnabled()
		}

		Function("requestNotificationPermission") {
			val context = appContext.reactContext ?: return@Function false
			val prefs = context.getSharedPreferences("source_validation_reminders", 0)
			val askedKey = "permission_requested"
			if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
				NotificationManagerCompat.from(context).areNotificationsEnabled() ||
				prefs.getBoolean(askedKey, false)
			) {
				return@Function false
			}
			val activity = appContext.activityProvider?.currentActivity ?: return@Function false
			prefs.edit().putBoolean(askedKey, true).apply()
			ActivityCompat.requestPermissions(
				activity,
				arrayOf(Manifest.permission.POST_NOTIFICATIONS),
				0,
			)
			true
		}
	}
}
