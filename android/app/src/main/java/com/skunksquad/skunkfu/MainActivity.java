package com.skunksquad.skunkfu;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;

import androidx.activity.EdgeToEdge;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Banner ads are now managed by @capacitor-community/admob plugin via JS (adManager.js).
 * MobileAds.initialize() is handled by the plugin — no native ad code needed here.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Android 12+ Splash Screen: installSplashScreen() MUST be called
        // before super.onCreate() to trigger the postSplashScreenTheme swap
        // (AppTheme.NoActionBarLaunch → AppTheme.NoActionBar). Without this,
        // the launch theme's window background (previously the white splash.png,
        // now dark appBackground as a safety net) stays active for the lifetime
        // of the activity and leaks through any status-bar-area gap.
        SplashScreen.installSplashScreen(this);
        // Opt into proper edge-to-edge rendering. Required for targetSdk 35+
        // to avoid using deprecated Window.setStatusBarColor / setNavigationBarColor.
        // Must be called BEFORE super.onCreate() per the AndroidX guidance.
        // Safe-area insets are forwarded to CSS via env(safe-area-inset-*).
        EdgeToEdge.enable(this);
        registerPlugin(PlayGamesPlugin.class);
        super.onCreate(savedInstanceState);

        // Force the WebView background black so any region behind the
        // game canvas reads as our dark theme (not the WebView's default
        // white). Belt-and-suspenders alongside the theme + immersive
        // mode below.
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().setBackgroundColor(Color.BLACK);
            }
        } catch (Throwable t) { /* defensive — never crash on theme tweak */ }

        // Sticky immersive: hide status bar AND navigation bar so the
        // game owns the whole screen. Bars reappear with a swipe and
        // auto-hide again. This is the "true fullscreen" experience.
        applyImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Re-apply immersive whenever the window regains focus —
        // Android resets it after dialogs / billing sheets / app switch.
        if (hasFocus) applyImmersiveMode();
    }

    private void applyImmersiveMode() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
                WindowInsetsControllerCompat controller =
                        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
                if (controller != null) {
                    controller.hide(
                            androidx.core.view.WindowInsetsCompat.Type.statusBars()
                                    | androidx.core.view.WindowInsetsCompat.Type.navigationBars()
                    );
                    controller.setSystemBarsBehavior(
                            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    );
                }
            } else {
                // Pre-Android 11 fallback (sticky immersive flags).
                int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
                getWindow().getDecorView().setSystemUiVisibility(flags);
            }
        } catch (Throwable t) { /* never crash on UI tweak */ }
    }
}
