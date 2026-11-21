package com.purple.coins.alerts

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object AlertQueue {
	private const val PREFS = "transaction_alerts"
	private const val KEY_QUEUE = "queue"
	private const val MAX_PENDING = 50

	private fun prefs(context: Context) =
		context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

	@Synchronized
	fun push(context: Context, alert: ParsedAlert) {
		val store = prefs(context)
		val queue = JSONArray(store.getString(KEY_QUEUE, "[]"))
		// Drop exact duplicates (same source, same second, same amount+text gist).
		for (index in 0 until queue.length()) {
			val existing = queue.getJSONObject(index)
			if (
				existing.optString("packageName") == alert.packageName &&
				existing.optString("amount") == alert.amount &&
				existing.optString("reason") == alert.reason &&
				kotlin.math.abs(existing.optLong("postedAt") - alert.postedAt) < 60_000
			) {
				return
			}
		}
		queue.put(
			JSONObject()
				.put("type", alert.type)
				.put("amount", alert.amount)
				.put("reason", alert.reason)
				.put("packageName", alert.packageName)
				.put("postedAt", alert.postedAt),
		)
		while (queue.length() > MAX_PENDING) queue.remove(0)
		store.edit().putString(KEY_QUEUE, queue.toString()).apply()
	}

	@Synchronized
	fun drain(context: Context): List<Map<String, Any>> {
		val store = prefs(context)
		val queue = JSONArray(store.getString(KEY_QUEUE, "[]"))
		store.edit().remove(KEY_QUEUE).apply()
		return buildList {
			for (index in 0 until queue.length()) {
				val alert = queue.getJSONObject(index)
				add(
					mapOf(
						"type" to alert.optString("type"),
						"amount" to alert.optString("amount"),
						"reason" to alert.optString("reason"),
						"packageName" to alert.optString("packageName"),
						"postedAt" to alert.optLong("postedAt"),
					),
				)
			}
		}
	}
}
