package com.jhonsu01.sunsamstore

import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import kotlin.concurrent.thread

/**
 * Descarga → verificación SHA-256 → sesión de PackageInstaller.
 * Si la huella no coincide con la del catálogo, el archivo se borra y no se instala.
 */
object ApkInstaller {

    @Volatile var activity: MainActivity? = null
    private val busy = mutableSetOf<String>()

    fun start(act: MainActivity, url: String, expectedSha: String, pkg: String, label: String) {
        activity = act
        synchronized(busy) { if (!busy.add(pkg)) return }
        thread(name = "install-$pkg") {
            try {
                val apk = download(url, pkg, label)
                act.sendProgress(pkg, 100, "verifying", "verifying")
                val actual = sha256(apk)
                if (actual != expectedSha) {
                    apk.delete()
                    act.sendProgress(pkg, 0, "error", "sha256 mismatch", "hash")
                    return@thread
                }
                act.sendProgress(pkg, 100, "installing", "installing")
                commit(act, apk, pkg)
            } catch (e: Exception) {
                act.sendProgress(pkg, 0, "error", e.message ?: e.javaClass.simpleName, "network")
            } finally {
                synchronized(busy) { busy.remove(pkg) }
            }
        }
    }

    private fun download(url: String, pkg: String, label: String): File {
        val dir = File(activity!!.cacheDir, "apk").apply { mkdirs() }
        val out = File(dir, "$pkg.apk")
        var target = URL(url)
        var conn: HttpURLConnection
        var hops = 0
        // GitHub responde con redirecciones a su CDN; se siguen de forma explícita.
        while (true) {
            conn = (target.openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = false
                connectTimeout = 20_000
                readTimeout = 30_000
                setRequestProperty("User-Agent", "SunsamStore/${BuildConfig.VERSION_NAME}")
            }
            val code = conn.responseCode
            if (code in 300..399 && hops++ < 6) {
                target = URL(target, conn.getHeaderField("Location")); conn.disconnect(); continue
            }
            if (code != 200) throw IllegalStateException("HTTP $code")
            break
        }
        val total = conn.contentLengthLong
        var done = 0L
        var lastPct = -1
        conn.inputStream.use { input ->
            out.outputStream().use { output ->
                val buf = ByteArray(64 * 1024)
                while (true) {
                    val n = input.read(buf); if (n < 0) break
                    output.write(buf, 0, n); done += n
                    val pct = if (total > 0) (done * 100 / total).toInt() else 0
                    if (pct != lastPct) {
                        lastPct = pct
                        activity?.sendProgress(pkg, pct, "downloading", "", null, done, total)
                    }
                }
            }
        }
        conn.disconnect()
        return out
    }

    private fun commit(act: MainActivity, apk: File, pkg: String) {
        val installer = act.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(pkg)
            setSize(apk.length())
            if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val id = installer.createSession(params)
        installer.openSession(id).use { session ->
            session.openWrite("base.apk", 0, apk.length()).use { out ->
                apk.inputStream().use { it.copyTo(out) }
                session.fsync(out)
            }
            val intent = Intent(act, InstallReceiver::class.java).putExtra(InstallReceiver.EXTRA_PKG, pkg)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
            session.commit(PendingIntent.getBroadcast(act, id, intent, flags).intentSender)
        }
        apk.delete()
    }

    private fun sha256(f: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        f.inputStream().use { input ->
            val buf = ByteArray(64 * 1024)
            while (true) { val n = input.read(buf); if (n < 0) break; md.update(buf, 0, n) }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }
}
