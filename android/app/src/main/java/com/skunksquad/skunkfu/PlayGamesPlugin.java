package com.skunksquad.skunkfu;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.games.AchievementsClient;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.LeaderboardsClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.leaderboard.LeaderboardVariant;

/**
 * Capacitor plugin bridging Google Play Games Services v2 to the JS layer.
 * Provides sign-in, leaderboard, and achievement APIs.
 */
@CapacitorPlugin(name = "PlayGamesServices")
public class PlayGamesPlugin extends Plugin {

    private static final String TAG = "PlayGamesPlugin";

    @Override
    public void load() {
        // Initialize the Play Games SDK (required once per app lifecycle)
        try {
            PlayGamesSdk.initialize(getContext());
            Log.i(TAG, "Play Games SDK initialized");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Play Games SDK", e);
        }
    }

    // ────────────────────────────────────────────────────────────
    // Sign-In
    // ────────────────────────────────────────────────────────────

    @PluginMethod
    public void signIn(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }

        GamesSignInClient client = PlayGames.getGamesSignInClient(activity);
        client.isAuthenticated().addOnCompleteListener(task -> {
            boolean isAuthenticated = task.isSuccessful() && task.getResult().isAuthenticated();

            if (isAuthenticated) {
                resolvePlayerInfo(call);
            } else {
                // Trigger explicit sign-in
                client.signIn().addOnCompleteListener(signInTask -> {
                    if (signInTask.isSuccessful()) {
                        resolvePlayerInfo(call);
                    } else {
                        Log.w(TAG, "Sign-in failed", signInTask.getException());
                        call.reject("Sign-in failed", signInTask.getException());
                    }
                });
            }
        });
    }

    @PluginMethod
    public void isAuthenticated(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }

        GamesSignInClient client = PlayGames.getGamesSignInClient(activity);
        client.isAuthenticated().addOnCompleteListener(task -> {
            boolean authenticated = task.isSuccessful() && task.getResult().isAuthenticated();
            if (authenticated) {
                resolvePlayerInfo(call);
            } else {
                JSObject result = new JSObject();
                result.put("isAuthenticated", false);
                call.resolve(result);
            }
        });
    }

    private void resolvePlayerInfo(PluginCall call) {
        Activity activity = getActivity();
        PlayGames.getPlayersClient(activity).getCurrentPlayer()
            .addOnSuccessListener(player -> {
                JSObject result = new JSObject();
                result.put("isAuthenticated", true);
                result.put("playerId", player.getPlayerId());
                result.put("displayName", player.getDisplayName());
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                JSObject result = new JSObject();
                result.put("isAuthenticated", true);
                result.put("playerId", "");
                result.put("displayName", "");
                call.resolve(result);
            });
    }

    // ────────────────────────────────────────────────────────────
    // Leaderboards
    // ────────────────────────────────────────────────────────────

    @PluginMethod
    public void submitScore(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        Integer score = call.getInt("score");
        if (leaderboardId == null || score == null) {
            call.reject("leaderboardId and score are required");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }

        LeaderboardsClient client = PlayGames.getLeaderboardsClient(activity);
        client.submitScore(leaderboardId, score);
        Log.i(TAG, "Score submitted: " + score + " to " + leaderboardId);

        JSObject result = new JSObject();
        result.put("submitted", true);
        call.resolve(result);
    }

    @PluginMethod
    public void showLeaderboard(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        String timeSpanStr = call.getString("timeSpan");

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }

        LeaderboardsClient client = PlayGames.getLeaderboardsClient(activity);

        // Map JS time-span string → PGS LeaderboardVariant constant.
        Integer timeSpan = null;
        if (timeSpanStr != null) {
            switch (timeSpanStr.toUpperCase()) {
                case "DAILY":    timeSpan = LeaderboardVariant.TIME_SPAN_DAILY; break;
                case "WEEKLY":   timeSpan = LeaderboardVariant.TIME_SPAN_WEEKLY; break;
                case "ALL_TIME":
                case "ALLTIME":  timeSpan = LeaderboardVariant.TIME_SPAN_ALL_TIME; break;
                default:         timeSpan = null;
            }
        }

        if (leaderboardId != null && !leaderboardId.isEmpty()) {
            if (timeSpan != null) {
                client.getLeaderboardIntent(leaderboardId, timeSpan, LeaderboardVariant.COLLECTION_PUBLIC)
                    .addOnSuccessListener(intent -> activity.startActivity(intent))
                    .addOnFailureListener(e -> call.reject("Failed to show leaderboard", e));
            } else {
                client.getLeaderboardIntent(leaderboardId)
                    .addOnSuccessListener(intent -> activity.startActivity(intent))
                    .addOnFailureListener(e -> call.reject("Failed to show leaderboard", e));
            }
        } else {
            client.getAllLeaderboardsIntent()
                .addOnSuccessListener(intent -> activity.startActivity(intent))
                .addOnFailureListener(e -> call.reject("Failed to show leaderboards", e));
        }

        call.resolve();
    }

    // ────────────────────────────────────────────────────────────
    // Achievements
    // ────────────────────────────────────────────────────────────

    @PluginMethod
    public void unlockAchievement(PluginCall call) {
        String achievementId = call.getString("achievementId");
        if (achievementId == null) {
            call.reject("achievementId is required");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }

        AchievementsClient client = PlayGames.getAchievementsClient(activity);
        client.unlock(achievementId);
        Log.i(TAG, "Achievement unlocked: " + achievementId);

        JSObject result = new JSObject();
        result.put("unlocked", true);
        call.resolve(result);
    }

    @PluginMethod
    public void incrementAchievement(PluginCall call) {
        String achievementId = call.getString("achievementId");
        Integer steps = call.getInt("steps", 1);
        if (achievementId == null) {
            call.reject("achievementId is required");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }

        AchievementsClient client = PlayGames.getAchievementsClient(activity);
        client.increment(achievementId, steps);
        Log.i(TAG, "Achievement incremented: " + achievementId + " +" + steps);

        JSObject result = new JSObject();
        result.put("incremented", true);
        call.resolve(result);
    }

    @PluginMethod
    public void showAchievements(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }

        AchievementsClient client = PlayGames.getAchievementsClient(activity);
        client.getAchievementsIntent()
            .addOnSuccessListener(intent -> activity.startActivity(intent))
            .addOnFailureListener(e -> call.reject("Failed to show achievements", e));

        call.resolve();
    }
}
