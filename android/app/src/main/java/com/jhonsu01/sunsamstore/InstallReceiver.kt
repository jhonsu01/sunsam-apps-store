package com.jhonsu01.sunsamstore

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build

/** Recibe el resultado de la sesión de PackageInstaller y lo reenvía a la tienda web. */
class InstallReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val pkg = intent.getStringExtra(EXTRA_PKG).orEmpty()
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        val act = ApkInstaller.activity
        when (status) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm = if (Build.VERSION.SDK_INT >= 33)
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                else @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_INTENT)
                confirm?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)?.let(context::startActivity)
                act?.sendProgress(pkg, 100, "installing", "confirm", "confirm")
            }
            PackageInstaller.STATUS_SUCCESS ->
                act?.sendProgress(pkg, 100, "done", "done")
            PackageInstaller.STATUS_FAILURE_ABORTED ->
                act?.sendProgress(pkg, 0, "cancelled", "cancelled")
            PackageInstaller.STATUS_FAILURE_CONFLICT ->
                act?.sendProgress(pkg, 0, "error", "signature conflict", "conflict")
            PackageInstaller.STATUS_FAILURE_INCOMPATIBLE ->
                act?.sendProgress(pkg, 0, "error", "incompatible", "incompatible")
            PackageInstaller.STATUS_FAILURE_STORAGE ->
                act?.sendProgress(pkg, 0, "error", "storage", "storage")
            else -> {
                val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "error $status"
                act?.sendProgress(pkg, 0, "error", msg, "other")
            }
        }
    }

    companion object { const val EXTRA_PKG = "pkg" }
}
