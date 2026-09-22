package pl.licznikgps

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.IBinder
import androidx.core.app.NotificationCompat

class GpsService : Service() {
    private lateinit var locationManager: LocationManager
    private var lastLocation: Location? = null

    override fun onCreate() {
        super.onCreate()

        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channel = NotificationChannel(
            "gps",
            "Licznik GPS",
            NotificationManager.IMPORTANCE_LOW
        )
        notificationManager.createNotificationChannel(channel)

        val notification = NotificationCompat.Builder(this, "gps")
            .setContentTitle("Licznik GPS")
            .setContentText("GPS działa – liczona jest trasa")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()

        startForeground(1, notification)

        locationManager =
            getSystemService(Context.LOCATION_SERVICE) as LocationManager

        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED
        ) {
            stopSelf()
            return
        }

        locationManager.requestLocationUpdates(
            LocationManager.GPS_PROVIDER,
            1000L,
            3f,
            locationListener
        )
    }

    private val locationListener = LocationListener { location ->
        val previous = lastLocation

        if (previous != null && location.accuracy <= 100f) {
            val distanceKm = previous.distanceTo(location) / 1000.0

            if (distanceKm > 0.0 && distanceKm <= 0.3) {
                val prefs = getSharedPreferences("gps", Context.MODE_PRIVATE)
                val currentKm = prefs.getFloat("km", 0f)

                prefs.edit()
                    .putFloat("km", currentKm + distanceKm.toFloat())
                    .apply()
            }
        }

        lastLocation = location
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        if (::locationManager.isInitialized) {
            try {
                locationManager.removeUpdates(locationListener)
            } catch (_: Exception) {
            }
        }
        super.onDestroy()
    }
}
