# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ── Capacitor WebView bridge ────────────────────────────────────
# Keep all Capacitor plugin + bridge classes so JS↔Java calls work.
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-dontwarn com.getcapacitor.**

# Keep JS-annotated interfaces used by WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── AdMob ────────────────────────────────────────────────────────
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# ── Google Play Games ────────────────────────────────────────────
-keep class com.google.android.gms.games.** { *; }
-dontwarn com.google.android.gms.games.**

# ── Google Play Billing Library ─────────────────────────────────
# CRITICAL: without these rules, R8 strips/renames billing classes in
# release builds. The cordova-plugin-purchase native bridge then fails
# silently — JS sees window.CdvPurchase but Google Play API calls throw
# or return null, leaving the Buy button non-functional. This is the
# documented root cause of "IAP works in dev, broken in production AAB".
-keep class com.android.billingclient.api.** { *; }
-keep interface com.android.billingclient.api.** { *; }
-dontwarn com.android.billingclient.api.**

# ── Cordova framework + cordova-plugin-purchase (Fovea) ─────────
# cordova-plugin-purchase v13's native bridge lives in cc.fovea.*
# (Constants.java + PurchasePlugin.java). It's invoked reflectively by
# Cordova's exec() pipeline, so we must keep both packages intact.
-keep class org.apache.cordova.** { *; }
-keep class cc.fovea.** { *; }
-keepclassmembers class cc.fovea.** { *; }
-dontwarn org.apache.cordova.**
-dontwarn cc.fovea.**

# Keep CordovaPlugin subclasses (action dispatch is reflection-based).
-keep public class * extends org.apache.cordova.CordovaPlugin
-keepclassmembers class * extends org.apache.cordova.CordovaPlugin {
    public *;
}

# ── Firebase (if google-services.json is present) ───────────────
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
