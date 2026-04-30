package com.skunksquad.skunkfu;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

/**
 * Banner ads are now managed by @capacitor-community/admob plugin via JS (adManager.js).
 * MobileAds.initialize() is handled by the plugin — no native ad code needed here.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Opt into proper edge-to-edge rendering. Required for targetSdk 35+
        // to avoid using deprecated Window.setStatusBarColor / setNavigationBarColor.
        // Must be called BEFORE super.onCreate() per the AndroidX guidance.
        // Safe-area insets are forwarded to CSS via env(safe-area-inset-*).
        EdgeToEdge.enable(this);
        registerPlugin(PlayGamesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
