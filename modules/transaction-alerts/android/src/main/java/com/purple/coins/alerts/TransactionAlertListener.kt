package com.purple.coins.alerts

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class TransactionAlertListener : NotificationListenerService() {
	override fun onNotificationPosted(sbn: StatusBarNotification) {
		if (sbn.packageName == packageName) return
		val extras = sbn.notification?.extras ?: return
		val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
		val text = (
			extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
				?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
			).orEmpty()
		AlertParser.parse(sbn.packageName, title, text)?.let { alert ->
			AlertQueue.push(applicationContext, alert.copy(postedAt = sbn.postTime))
		}
	}
}
