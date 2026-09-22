package pl.licznikgps

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.*
import java.util.*

class MainActivity : Activity() {
    private val sp by lazy { getSharedPreferences("gps", 0) }
    private lateinit var km: TextView
    private lateinit var speed: TextView
    private lateinit var time: TextView
    private lateinit var avg: TextView
    private lateinit var acc: TextView
    private lateinit var fuel: TextView
    private lateinit var cost: TextView
    private lateinit var status: TextView
    private var startedAt = 0L
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())

    private val bg = Color.rgb(11, 18, 32)
    private val card = Color.rgb(21, 31, 50)
    private val statCard = Color.rgb(32, 43, 64)
    private val muted = Color.rgb(174, 185, 204)
    private val green = Color.rgb(40, 199, 111)
    private val red = Color.rgb(239, 83, 80)

    private fun text(s: String, size: Float, bold: Boolean = false): TextView =
        TextView(this).apply {
            this.text = s
            textSize = size
            setTextColor(Color.WHITE)
            if (bold) typeface = Typeface.DEFAULT_BOLD
        }

    private fun rounded(color: Int, radius: Float = 18f): GradientDrawable =
        GradientDrawable().apply { setColor(color); cornerRadius = radius }

    private fun button(label: String, color: Int, action: () -> Unit): Button =
        Button(this).apply {
            text = label
            textSize = 17f
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            isAllCaps = false
            background = rounded(color, 16f)
            setPadding(8, 0, 8, 0)
            setOnClickListener { action() }
        }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        buildUi()
        registerReceiver(receiver, IntentFilter("pl.licznikgps.UPDATE"), Context.RECEIVER_NOT_EXPORTED)
        refresh()
    }

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) { refresh() }
    }

    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 12, 16, 16)
            setBackgroundColor(bg)
        }

        val title = text("🚗 Licznik GPS", 29f, true)
        root.addView(title, LinearLayout.LayoutParams(-1, 54))

        status = text("● GOTOWY", 14f, true).apply { setTextColor(green) }
        root.addView(status, LinearLayout.LayoutParams(-1, 34))

        val mainCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            background = rounded(card, 22f)
            setPadding(20, 18, 20, 18)
        }

        mainCard.addView(text("PRZEJECHANE", 13f).apply {
            setTextColor(muted); gravity = Gravity.CENTER
        })
        km = text("0.00", 62f, true).apply { gravity = Gravity.CENTER }
        mainCard.addView(km, LinearLayout.LayoutParams(-1, 82))
        mainCard.addView(text("km", 16f).apply {
            setTextColor(muted); gravity = Gravity.CENTER
        })

        val grid = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val row1 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val row2 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row1.addView(stat("Aktualna prędkość", "0 km/h").also { speed = it }, lp())
        row1.addView(stat("Czas", "00:00:00").also { time = it }, lp())
        row2.addView(stat("Średnia", "0 km/h").also { avg = it }, lp())
        row2.addView(stat("Dokładność GPS", "— m").also { acc = it }, lp())
        grid.addView(row1); grid.addView(row2)
        mainCard.addView(grid, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(mainCard, LinearLayout.LayoutParams(-1, 0, 1.0f))

        val money = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 10, 0, 6)
        }
        money.addView(stat("⛽ Spalone LPG", "0.00 l").also { fuel = it }, lp())
        money.addView(stat("💰 Koszt przejazdu", "0.00 zł").also { cost = it }, lp())
        root.addView(money)

        val start = button("▶  START", green) { startGps() }
        val stop = button("■  STOP", red) { stopGps() }
        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        actions.addView(start, lp())
        actions.addView(stop, lp())
        root.addView(actions, LinearLayout.LayoutParams(-1, 58))

        val tools = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        tools.addView(button("↺  Wyzeruj", statCard) { reset() }, lp())
        tools.addView(button("⚙  Ustawienia", statCard) { settings() }, lp())
        root.addView(tools, LinearLayout.LayoutParams(-1, 54))
        root.addView(button("📋  Historia", statCard) { history() }, LinearLayout.LayoutParams(-1, 54))

        setContentView(root)
    }

    private fun lp() = LinearLayout.LayoutParams(0, 58, 1f).apply { setMargins(5, 5, 5, 5) }

    private fun stat(label: String, value: String): TextView {
        return TextView(this).apply {
            text = "$label\n$value"
            textSize = 16f
            setTextColor(Color.WHITE)
            setPadding(14, 12, 8, 10)
            background = rounded(statCard, 15f)
            val first = text
            gravity = Gravity.CENTER_VERTICAL
        }
    }

    private fun refresh() {
        val k = sp.getFloat("km", 0f).toDouble()
        val l = sp.getFloat("consumption", 11f).toDouble()
        val p = sp.getFloat("price", 3.2f).toDouble()
        km.text = String.format(Locale.US, "%.2f", k)
        speed.text = "Aktualna prędkość\n%.0f km/h".format(Locale.US, sp.getFloat("speed", 0f))
        fuel.text = "⛽ Spalone LPG\n%.2f l".format(Locale.US, k * l / 100)
        cost.text = "💰 Koszt przejazdu\n%.2f zł".format(Locale.US, k * l * p / 100)
        val running = sp.getBoolean("running", false)
        status.text = if (running) "● GPS AKTYWNY" else "● GOTOWY"
        status.setTextColor(if (running) green else muted)
        if (running && startedAt == 0L) startedAt = System.currentTimeMillis()
        updateClock()
    }

    private fun updateClock() {
        val running = sp.getBoolean("running", false)
        if (!running) {
            time.text = "Czas\n00:00:00"
            avg.text = "Średnia\n0 km/h"
            handler.removeCallbacksAndMessages(null)
            return
        }
        val seconds = ((System.currentTimeMillis() - startedAt) / 1000).coerceAtLeast(0)
        val h = seconds / 3600
        val m = (seconds % 3600) / 60
        val s = seconds % 60
        time.text = "Czas\n%02d:%02d:%02d".format(h, m, s)
        val k = sp.getFloat("km", 0f)
        val hours = seconds / 3600.0
        avg.text = "Średnia\n%.1f km/h".format(Locale.US, if (hours > 0) k / hours else 0.0)
        handler.postDelayed({ updateClock() }, 1000)
    }

    private fun startGps() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.POST_NOTIFICATIONS), 7)
            return
        }
        startedAt = System.currentTimeMillis()
        startForegroundService(Intent(this, GpsService::class.java))
        refresh()
    }

    private fun stopGps() {
        stopService(Intent(this, GpsService::class.java))
        refresh()
    }

    private fun reset() {
        stopGps()
        sp.edit().remove("km").remove("speed").apply()
        startedAt = 0L
        refresh()
    }

    private fun settings() {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(24, 8, 24, 8) }
        val c = EditText(this).apply {
            hint = "Spalanie l/100 km"
            setText(sp.getFloat("consumption", 11f).toString())
            inputType = 2
        }
        val p = EditText(this).apply {
            hint = "Cena LPG zł/l"
            setText(sp.getFloat("price", 3.2f).toString())
            inputType = 2
        }
        box.addView(c); box.addView(p)
        AlertDialog.Builder(this).setTitle("⛽ Ustawienia LPG").setView(box)
            .setPositiveButton("ZAPISZ") { _, _ ->
                sp.edit().putFloat("consumption", c.text.toString().replace(',', '.').toFloatOrNull() ?: 11f)
                    .putFloat("price", p.text.toString().replace(',', '.').toFloatOrNull() ?: 3.2f).apply()
                refresh()
            }.setNegativeButton("ANULUJ", null).show()
    }

    private fun history() {
        val h = sp.getStringSet("history", emptySet())!!.toList().sortedDescending()
        AlertDialog.Builder(this).setTitle("📋 Historia")
            .setMessage(if (h.isEmpty()) "Brak zapisanych przejazdów." else h.joinToString("\n\n"))
            .setPositiveButton("OK", null).show()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        try { unregisterReceiver(receiver) } catch (_: Exception) {}
        super.onDestroy()
    }
}