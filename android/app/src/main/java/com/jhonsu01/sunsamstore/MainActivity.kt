package com.jhonsu01.sunsamstore

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import org.json.JSONObject

/**
 * Muestra la tienda web (GitHub Pages) en una WebView y expone [StoreBridge] como
 * `window.SunsamNative`. Sin red, sirve la copia empaquetada en assets/site desde un
 * origen HTTPS ficticio para que fetch('apps.json') siga funcionando.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private var usingOffline = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0f0d14"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.userAgentString += " SunsamStore/${BuildConfig.VERSION_NAME}"
            addJavascriptInterface(StoreBridge(this@MainActivity, this), "SunsamNative")
            webChromeClient = WebChromeClient()
            webViewClient = StoreClient()
        }
        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#0f0d14"))
            addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        }
        setContentView(root)
        applyInsets(root)
        web.loadUrl(intent?.data?.toString()?.takeIf { it.startsWith(ONLINE) } ?: ONLINE)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.toString()?.takeIf { it.startsWith(ONLINE) }?.let { web.loadUrl(it) }
    }

    override fun onResume() {
        super.onResume()
        // Refresca los botones Instalar/Actualizar/Abrir al volver del instalador.
        web.evaluateJavascript("document.dispatchEvent(new Event('visibilitychange'))", null)
    }

    /** targetSdk 35 fuerza edge-to-edge: se deja margen para las barras del sistema. */
    private fun applyInsets(view: View) {
        view.setOnApplyWindowInsetsListener { v, insets ->
            val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
    }

    fun sendProgress(pkg: String, percent: Int, state: String, message: String) {
        val args = "${JSONObject.quote(pkg)},$percent,${JSONObject.quote(state)},${JSONObject.quote(message)}"
        runOnUiThread { web.evaluateJavascript("window.sunsamProgress && window.sunsamProgress($args)", null) }
    }

    @Deprecated("Navegación atrás clásica; suficiente para una WebView con rutas hash.")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    private inner class StoreClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url.toString()
            if (url.startsWith(ONLINE) || url.startsWith(OFFLINE)) return false
            // Play Store, Microsoft Store, GitHub e instaladores se abren fuera de la tienda.
            runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
            return true
        }

        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            val url = request.url.toString()
            if (!url.startsWith(OFFLINE)) return null
            var path = request.url.path.orEmpty().trimStart('/').ifEmpty { "index.html" }
            if (path.endsWith("/")) path += "index.html"
            return runCatching {
                WebResourceResponse(mime(path), "utf-8", assets.open("site/$path"))
            }.getOrElse { WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), null) }
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: android.webkit.WebResourceError) {
            if (request.isForMainFrame) fallBackOffline(view, request)
        }

        override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
            if (request.isForMainFrame && response.statusCode >= 400) fallBackOffline(view, request)
        }

        /** Sin conexión o sitio caído: carga la copia empaquetada conservando la ruta (#/app/...). */
        private fun fallBackOffline(view: WebView, request: WebResourceRequest) {
            if (usingOffline) return
            usingOffline = true
            val hash = request.url.fragment?.let { "#$it" } ?: ""
            view.loadUrl("$OFFLINE/index.html$hash")
        }
    }

    private fun mime(path: String) = when (path.substringAfterLast('.').lowercase()) {
        "html" -> "text/html"; "js" -> "application/javascript"; "css" -> "text/css"
        "json" -> "application/json"; "svg" -> "image/svg+xml"; "png" -> "image/png"
        "webp" -> "image/webp"; "webmanifest" -> "application/manifest+json"
        else -> "application/octet-stream"
    }

    companion object {
        const val ONLINE = "https://jhonsu01.github.io/sunsam-apps-store/"
        const val OFFLINE = "https://sunsam.offline"
    }
}
