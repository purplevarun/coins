package com.purple.coins.alerts

import android.app.Notification
import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class TransactionAlertListener : NotificationListenerService() {
	override fun onNotificationPosted(sbn: StatusBarNotification) {
		if (sbn.packageName == packageName) return
		val extras = sbn.notification?.extras ?: return
		val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
		val text = listOfNotNull(
			extras.getCharSequence(Notification.EXTRA_TEXT),
			extras.getCharSequence(Notification.EXTRA_BIG_TEXT),
			extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
				?.joinToString(" "),
		).joinToString(" ") { it.toString() }
		AlertParser.parse(sbn.packageName, title, text)?.let { alert ->
			AlertQueue.push(applicationContext, alert.copy(postedAt = sbn.postTime))
		}
	}

	override fun onListenerDisconnected() {
		requestRebind(ComponentName(this, TransactionAlertListener::class.java))
	}
}
