package com.skunksquad.skunkfu;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * Banner ads are now managed by @capacitor-community/admob plugin via JS (adManager.js).
 * MobileAds.initialize() is handled by the plugin — no native ad code needed here.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
}
