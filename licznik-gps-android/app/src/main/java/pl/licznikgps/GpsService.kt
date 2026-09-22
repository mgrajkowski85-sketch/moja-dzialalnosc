package pl.licznikgps
import android.app.*;import android.content.*;import android.location.Location;import android.os.*;import androidx.core.app.NotificationCompat
class GpsService:Service(){
 private lateinit var lm:android.location.LocationManager;private var last:Location?=null
 override fun onCreate(){super.onCreate();val ch=NotificationChannel("gps","Licznik GPS",NotificationManager.IMPORTANCE_LOW);getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
  startForeground(1,NotificationCompat.Builder(this,"gps").setContentTitle("Licznik GPS").setContentText("GPS działa – liczona jest trasa").setSmallIcon(android.R.drawable.ic_menu_mylocation).build())
  lm=getSystemService(LocationManager::class.java);if(checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)!=0)return;lm.requestLocationUpdates(android.location.LocationManager.GPS_PROVIDER,1000,3f,listener,mainLooper)}
 private val listener=object:android.location.LocationListener{override fun onLocationChanged(l:Location){val p=last;if(p!=null&&l.accuracy<=100){val d=p.distanceTo(l)/1000.0;if(d>0&&d<=.3){val s=getSharedPreferences("gps",0);s.edit().putFloat("km",s.getFloat("km",0f)+d.toFloat()).apply()}};last=l}}
 override fun onBind(i:Intent?)=null
 override fun onDestroy(){try{lm.removeUpdates(listener)}catch(_:Exception){};super.onDestroy()}
}