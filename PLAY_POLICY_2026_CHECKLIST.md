# Google Play Policy Checklist (July 15, 2026)

Last reviewed: 2026-08-02
Project: Skunked: Way of the Spray (`com.skunksquad.skunkfu`)

## Scope
This checklist maps the July 15, 2026 Play policy update and related reminders to this codebase.

## 1) Age-Restricted Content / Child Safety / Families policy updates
Status: PASS (codebase), MANUAL VERIFY (Play Console targeting)

Evidence from code:
- App is a single-player action game; no anonymous/random chat feature was found.
- No user-to-user messaging stack was found.
- Privacy policy states 13+ audience and not directed to children.

Manual Play Console checks:
- Confirm target audience is not set to children under 13.
- Confirm age labels and store listing language match 13+ positioning.

## 2) SMS and Call Log permissions policy update
Status: PASS

Evidence from manifests:
- No `READ_CALL_LOG` permission.
- No SMS permissions (`READ_SMS`, `RECEIVE_SMS`, `SEND_SMS`).
- No call-verification flow found in app code.

Current Android permissions in app manifest:
- `com.google.android.gms.permission.AD_ID`
- `com.android.vending.BILLING`
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.WAKE_LOCK`

## 3) Android developer verification / app registration
Status: MANUAL ACTION REQUIRED

Cannot be verified from source code.

Manual Play Console checks:
- Open Play Console Home and confirm app is registered under Android developer verification.
- Register any non-registered app IDs to avoid distribution removal.

## 4) User Data policy clarification (including third-party AI)
Status: PARTIAL -> UPDATED IN POLICY TEXT

Actions taken:
- Updated privacy policy to accurately disclose backend leaderboard and entitlement processing.
- Updated privacy policy to disclose analytics events through GTM/dataLayer usage.
- Added explicit statement that no third-party generative AI integrations are currently used in production code paths.

Note:
- If AI services are added later (moderation, personalization, support, etc.), privacy policy and Data safety declarations must be updated before release.

## 5) Data safety location disclosure clarification
Status: PARTIAL -> UPDATED IN POLICY TEXT

Actions taken:
- Added explicit precise-vs-approximate location disclosure in privacy policy:
  - No intentional precise location collection in first-party code.
  - Approximate location may be processed by Google ads services.

Manual Play Console checks:
- Ensure Data safety form matches this exact behavior for location and identifiers.

## 6) Content ratings clarification (no unrated apps)
Status: MANUAL ACTION REQUIRED

Cannot be verified from source code.

Manual Play Console checks:
- Ensure the app has an active rating questionnaire result (IARC/content rating) and is not unrated.

## 7) Target API level reminder (Aug 31, 2026)
Status: PASS

Evidence from Android build config:
- `compileSdkVersion = 36`
- `targetSdkVersion = 36`

## Files updated for compliance alignment
- `privacy.html`

## Recommended release-gate before next Play upload
1. Re-check Data safety form fields against `privacy.html`.
2. Verify target audience and content rating in Play Console.
3. Verify developer/app registration status in Play Console Home.
4. Build and upload an internal-test AAB and run Play pre-launch report.
