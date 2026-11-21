package com.purple.coins.alerts

import android.content.Intent
import android.provider.Settings
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
	}
}
