package com.jhonsu01.sunsamstore

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView

/** API expuesta a la tienda web como `window.SunsamNative`. */
class StoreBridge(private val activity: MainActivity, private val web: WebView) {

    /** versionCode instalado, o -1 si la app no está instalada. */
    @JavascriptInterface
    fun getInstalledVersion(pkg: String): Long = try {
        val info = activity.packageManager.getPackageInfo(pkg, 0)
        if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
    } catch (_: PackageManager.NameNotFoundException) {
        -1L
    }

    @JavascriptInterface
    fun appVersionCode(): Int = BuildConfig.VERSION_CODE

    @JavascriptInterface
    fun appVersionName(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun canInstall(): Boolean = activity.packageManager.canRequestPackageInstalls()

    /** Descarga el APK, comprueba su SHA-256 y lo entrega al instalador del sistema. */
    @JavascriptInterface
    fun install(url: String, sha256: String, pkg: String, label: String) {
        if (!activity.packageManager.canRequestPackageInstalls()) {
            activity.sendProgress(pkg, 0, "error", "Permite que Sunsam Apps instale apps y vuelve a pulsar Instalar.")
            activity.runOnUiThread {
                activity.startActivity(
                    Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}"))
                )
            }
            return
        }
        ApkInstaller.start(activity, url, sha256.lowercase(), pkg, label)
    }

    @JavascriptInterface
    fun open(pkg: String): Boolean {
        val pm = activity.packageManager
        val launch = pm.getLaunchIntentForPackage(pkg) ?: pm.getLeanbackLaunchIntentForPackage(pkg) ?: return false
        activity.runOnUiThread { activity.startActivity(launch) }
        return true
    }

    @JavascriptInterface
    fun openExternal(url: String) {
        activity.runOnUiThread { runCatching { activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } }
    }
}
