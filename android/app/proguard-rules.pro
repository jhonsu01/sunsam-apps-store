# El puente JS se invoca por reflexión desde la WebView.
-keepclassmembers class com.jhonsu01.sunsamstore.StoreBridge {
    @android.webkit.JavascriptInterface <methods>;
}
