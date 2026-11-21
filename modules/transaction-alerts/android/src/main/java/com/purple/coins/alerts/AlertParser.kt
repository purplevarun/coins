package com.purple.coins.alerts

data class ParsedAlert(
	val type: String, // "DEBIT" | "CREDIT"
	val amount: String,
	val reason: String,
	val packageName: String,
	val postedAt: Long,
)

object AlertParser {
	// Packages that commonly surface bank/UPI/SMS transaction alerts.
	private val WATCHED_PACKAGES = setOf(
		"com.google.android.apps.messaging",
		"com.android.messaging",
		"com.samsung.android.messaging",
		"com.google.android.apps.nbu.paisa.user",
		"com.phonepe.app",
		"net.one97.paytm",
		"in.org.npci.upiapp",
		"com.csam.icici.bank.imobile",
		"com.snapwork.hdfc",
		"com.sbi.lotusintouch",
		"com.sbi.SBIFreedomPlus",
		"com.axis.mobile",
		"com.hdfcbank.payzapp",
		"com.bankofbaroda.mconnect",
		"com.icicibank.pockets",
		"com.kotakbank.mobilebanking",
	)

	private val AMOUNT_PATTERN = Regex(
		"(?:Rs\\.?|INR|₹)\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)",
		RegexOption.IGNORE_CASE,
	)

	private val DEBIT_PATTERN = Regex(
		"debited|spent|sent|paid|paying|purchase|withdrawn|debit\\b|dr\\.|transfer(?:red)?\\s+to|txn\\s+of",
		RegexOption.IGNORE_CASE,
	)

	private val CREDIT_PATTERN = Regex(
		"credited|received|deposited|refund|cashback|reversal|credit\\b|cr\\.",
		RegexOption.IGNORE_CASE,
	)

	private val MERCHANT_PATTERNS = listOf(
		Regex("\\bat\\s+([A-Za-z0-9 .&*'-]{2,40})", RegexOption.IGNORE_CASE),
		Regex("\\bto\\s+([A-Za-z0-9 .&*'-]{2,40})", RegexOption.IGNORE_CASE),
		Regex("\\bfrom\\s+([A-Za-z0-9 .&*'-]{2,40})", RegexOption.IGNORE_CASE),
		Regex("VPA\\s+([A-Za-z0-9._@\\-]{2,40})", RegexOption.IGNORE_CASE),
		Regex("Info:\\s*([A-Za-z0-9 .&*'-]{2,40})", RegexOption.IGNORE_CASE),
	)

	fun parse(packageName: String, title: String, text: String): ParsedAlert? {
		if (packageName !in WATCHED_PACKAGES) return null
		val body = "$title $text".trim()
		if (body.isEmpty()) return null

		val amountMatch = AMOUNT_PATTERN.find(body) ?: return null
		val amount = amountMatch.groupValues[1].replace(",", "")
		if (amount.toDoubleOrNull() == null || amount.toDouble() <= 0.0) return null

		val debit = DEBIT_PATTERN.containsMatchIn(body)
		val credit = CREDIT_PATTERN.containsMatchIn(body)
		if (debit == credit) return null // ambiguous — skip

		val merchant = MERCHANT_PATTERNS
			.firstNotNullOfOrNull { pattern ->
				pattern
					.find(body)
					?.groupValues?.get(1)
					?.trim(' ', '.', ',', ';', '-', '\'')
					?.takeIf { it.isNotBlank() }
			}
			?.take(40)
		val reason = merchant ?: title.trim().take(40).ifBlank {
			packageName.substringAfterLast('.')
		}

		return ParsedAlert(
			type = if (debit) "DEBIT" else "CREDIT",
			amount = amount,
			reason = reason,
			packageName = packageName,
			postedAt = System.currentTimeMillis(),
		)
	}
}
