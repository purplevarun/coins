package com.purple.coins.alerts

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.SharedPreferences
import android.database.sqlite.SQLiteDatabase
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.io.File
import java.util.concurrent.TimeUnit

// Hourly background check: notify once per 12h for each active source whose
// validated_at is more than 48h old.
object ValidationReminder {
	private const val WORK_NAME = "source-validation-reminders"
	private const val CHANNEL_ID = "source-validation-reminders"
	private const val PREFS_NAME = "source_validation_reminders"
	private const val DATABASE_NAME = "purplecoins.db"
	private const val STALE_AFTER_MS = 48L * 60 * 60 * 1000
	private const val RENOTIFY_AFTER_MS = 12L * 60 * 60 * 1000
	private const val CHECK_INTERVAL_HOURS = 1L
	private const val INITIAL_DELAY_MINUTES = 1L

	fun schedule(context: Context) {
		val request = PeriodicWorkRequestBuilder<ValidationCheckWorker>(
			CHECK_INTERVAL_HOURS, TimeUnit.HOURS,
		)
			.setInitialDelay(INITIAL_DELAY_MINUTES, TimeUnit.MINUTES)
			.build()
		WorkManager.getInstance(context).enqueueUniquePeriodicWork(
			WORK_NAME,
			ExistingPeriodicWorkPolicy.KEEP,
			request,
		)
	}

	fun runCheck(context: Context) {
		if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return
		// expo-sqlite stores databases under filesDir/SQLite/
		val dbFile = File(context.filesDir, "SQLite/$DATABASE_NAME")
		if (!dbFile.exists()) return

		val now = System.currentTimeMillis()
		val stale = queryStaleSources(dbFile.absolutePath, now)
		if (stale.isEmpty()) return

		val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
		val editor = prefs.edit()
		var changed = false
		for (source in stale) {
			val lastNotified = prefs.getLong(source.id, 0L)
			if (now - lastNotified < RENOTIFY_AFTER_MS) continue
			postNotification(context, source)
			editor.putLong(source.id, now)
			changed = true
		}
		if (changed) editor.apply()
	}

	private data class StaleSource(val id: String, val name: String)

	private fun queryStaleSources(dbPath: String, now: Long): List<StaleSource> {
		val stale = mutableListOf<StaleSource>()
		val db = SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY)
		db.use { database ->
			database.rawQuery(
				"SELECT id, name, validated_at FROM sources WHERE COALESCE(archived, 0) = 0",
				null,
			).use { cursor ->
				while (cursor.moveToNext()) {
					val validatedAt = if (cursor.isNull(2)) 0L else cursor.getLong(2)
					if (now - validatedAt > STALE_AFTER_MS) {
						stale.add(StaleSource(cursor.getString(0), cursor.getString(1)))
					}
				}
			}
		}
		return stale
	}

	private fun postNotification(context: Context, source: StaleSource) {
		val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
		manager.createNotificationChannel(
			NotificationChannel(
				CHANNEL_ID,
				"Source validation reminders",
				NotificationManager.IMPORTANCE_DEFAULT,
			),
		)
		val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
		val pending = PendingIntent.getActivity(
			context,
			source.id.hashCode(),
			launch,
			PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
		)
		val notification = NotificationCompat.Builder(context, CHANNEL_ID)
			.setSmallIcon(android.R.drawable.ic_dialog_info)
			.setContentTitle(source.name)
			.setContentText("You haven't validated ${source.name} in over 48 hours. Please validate.")
			.setAutoCancel(true)
			.setContentIntent(pending)
			.build()
		NotificationManagerCompat.from(context).notify(source.id.hashCode(), notification)
	}
}

class ValidationCheckWorker(
	context: Context,
	params: WorkerParameters,
) : Worker(context, params) {
	override fun doWork(): Result {
		ValidationReminder.runCheck(applicationContext)
		return Result.success()
	}
}
