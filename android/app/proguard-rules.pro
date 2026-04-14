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

# ── Firebase (if google-services.json is present) ───────────────
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
