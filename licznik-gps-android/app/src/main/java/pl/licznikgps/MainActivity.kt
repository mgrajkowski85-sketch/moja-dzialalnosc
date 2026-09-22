package pl.licznikgps
import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.*
import java.util.Locale

class MainActivity: Activity() {
 private val sp by lazy { getSharedPreferences("gps",0) }
 private lateinit var km:TextView; private lateinit var fuel:TextView; private lateinit var cost:TextView
 override fun onCreate(b:Bundle?){super.onCreate(b)
  val r=LinearLayout(this);r.orientation=LinearLayout.VERTICAL;r.setPadding(28,40,28,24);r.setBackgroundColor(0xff0b1220.toInt())
  fun t(s:String,z:Float)=TextView(this).apply{text=s;textSize=z;setTextColor(-1);setPadding(0,10,0,10)}
  r.addView(t("🚗 LICZNIK GPS",28f));km=t("0.00 km",58f);r.addView(km);r.addView(t("Spalanie: 11 l/100 km   |   LPG: 3,20 zł/l",16f))
  fuel=t("Spalone LPG: 0.00 l",20f);cost=t("Koszt: 0.00 zł",20f);r.addView(fuel);r.addView(cost)
  r.addView(Button(this).apply{text="▶ START";setOnClickListener{startGps()}})
  r.addView(Button(this).apply{text="■ STOP";setOnClickListener{stopService(Intent(this@MainActivity,GpsService::class.java))}})
  setContentView(r);update()
 }
 private fun startGps(){if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION,Manifest.permission.POST_NOTIFICATIONS),7);return};startForegroundService(Intent(this,GpsService::class.java))}
 private fun update(){val k=sp.getFloat("km",0f).toDouble();km.text=String.format(Locale.US,"%.2f km",k);fuel.text=String.format(Locale.US,"Spalone LPG: %.2f l",k*.11);cost.text=String.format(Locale.US,"Koszt: %.2f zł",k*.11*3.2)}
}