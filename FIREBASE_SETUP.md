# Firebase Hosting — Migration & Command Center Guide

This workspace remains your **single command center** for Skunked: Way of the Spray.
Everything — local dev, Firebase deploys, Android builds, testing — runs from VS Code.

---

## Architecture Overview

```
VS Code Workspace (Command Center)
├── js/                    ← Game source (client-side)
├── functions/             ← Firebase Cloud Functions (replaces Netlify functions)
│   ├── index.js           ← health, getLeaderboard, submitScore
│   └── package.json       ← separate deps (firebase-admin, firebase-functions)
├── dist/                  ← Build output → deployed to Firebase Hosting
├── firebase.json          ← Hosting config, rewrites, headers, emulators
├── .firebaserc            ← Project alias (studio-3829586481-2a2cf)
├── firestore.rules        ← Security rules (read: public, write: functions only)
├── firestore.indexes.json ← Composite indexes for score queries
├── android/               ← Capacitor Android shell
└── .github/workflows/
    ├── ci-deploy.yml           ← Existing Cloudflare Pages deploy (keep as fallback)
    ├── firebase-deploy.yml     ← NEW: auto-deploy to Firebase on push to main
    ├── playwright-tests.yml    ← Existing test suite
    └── sprite-padding.yml      ← Existing sprite tests
```

---

## One-Time Setup

### 1. Install Firebase CLI (global)
```bash
npm install -g firebase-tools
```

### 2. Log in to Google
```bash
firebase login
```
This opens a browser for Google OAuth. Your Firebase project is already linked
via `.firebaserc` → `studio-3829586481-2a2cf`.

### 3. Install Cloud Functions dependencies
```bash
cd functions && npm install && cd ..
```

### 4. Set up GitHub Actions secrets
In your GitHub repo → Settings → Secrets → Actions, add:

| Secret | How to get it |
|--------|---------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service Accounts → Generate New Private Key → paste JSON |
| `FIREBASE_TOKEN` | Run `firebase login:ci` locally, copy the token |

---

## VS Code Task Palette (your command center)

Press `Ctrl+Shift+P` → "Tasks: Run Task" to access all of these:

| Task | What it does |
|------|-------------|
| **Firebase: Start Emulators** | Runs Hosting + Functions + Firestore locally (port 5000, 5001, 8080) |
| **Firebase: Local Serve** | Builds `dist/` then serves via Firebase (production-like preview) |
| **Firebase: Deploy All** | Builds + deploys Hosting + Functions + Firestore rules |
| **Firebase: Deploy Hosting Only** | Quick deploy of just the static game files |
| **Firebase: Deploy Functions Only** | Update Cloud Functions without redeploying the game |
| **Firebase: Deploy Firestore Rules** | Push updated security rules |
| **Firebase: View Logs** | Stream Cloud Functions logs in the terminal |
| **Firebase: Open Console in Browser** | Jump to Firebase Console dashboard |
| **Run SkunkFU Game (JS)** | Still works — Python dev server on :8000 |
| **Capacitor: Build & Copy** | Still works — Android build pipeline unchanged |

### npm scripts (terminal)
```bash
npm run firebase:emulators        # Local emulators (hosting + functions + firestore)
npm run firebase:serve            # Build + Firebase serve
npm run firebase:deploy           # Build + deploy everything
npm run firebase:deploy:hosting   # Deploy hosting only
npm run firebase:deploy:functions # Deploy functions only
npm run firebase:deploy:rules     # Deploy firestore rules
```

---

## How the Pieces Fit Together

### Hosting
- **Build:** `npm run build` → outputs to `dist/`
- **Deploy:** `firebase deploy --only hosting` pushes `dist/` to Firebase CDN
- **Custom domain:** Firebase Console → Hosting → Add custom domain → `skunked.io`
  - Update your DNS (remove Netlify/Cloudflare CNAME, add Firebase's records)

### Cloud Functions (replaces Netlify Functions + S3)
The leaderboard API now talks directly to Firestore (same project, zero config):

| Endpoint | Netlify (old) | Firebase (new) |
|----------|---------------|----------------|
| `GET /api/health` | Netlify Function → static response | Cloud Function → `{ status: "ok" }` |
| `GET /api/scores` | Netlify Function → S3 bucket | Cloud Function → Firestore query |
| `POST /api/submit-score` | Netlify Function → S3 bucket | Cloud Function → Firestore write |

The client-side `js/firebase.js` still works as-is (reads directly from Firestore).
Cloud Functions handle writes with server-side validation + rate limiting.

### Firestore Security Rules
- **Read:** Public (anyone can read scores for the leaderboard)
- **Write:** Denied for clients (forces writes through Cloud Functions for validation)

### Emulators (local dev)
Run `Firebase: Start Emulators` to get a full local Firebase stack:
- **Hosting** on `http://localhost:5000` (serves your `dist/`)
- **Functions** on `http://localhost:5001`
- **Firestore** on `http://localhost:8080`
- **Emulator UI** on `http://localhost:4000` (manage local data, view logs)

### CI/CD
On push to `main`:
1. Tests run (Playwright suite)
2. Build runs (`npm run build`)
3. Auto-deploys to Firebase Hosting + Functions

The existing Cloudflare Pages workflow remains as a fallback — it gracefully
skips if secrets aren't set.

---

## Google Ecosystem Integration Points

Now that you're on Firebase, these are one-click additions:

| Service | Use case | How to enable |
|---------|----------|---------------|
| **Firebase Auth** | Player accounts, Google Sign-In | `firebase.json` + client SDK |
| **Firebase Analytics** | Player behavior, retention, level completion | Add `firebase/analytics` import |
| **Google AdMob** | Mobile ad monetization (Capacitor app) | AdMob SDK in `android/` |
| **Google Ads** | Web ad integration (already have ad client) | Works as-is with your existing `ca-app-pub-*` |
| **Cloud Storage** | Replay saves, custom sprites, UGC | `firebase/storage` import |
| **Remote Config** | A/B test game balance, feature flags | `firebase/remote-config` import |
| **Crashlytics** | Error reporting for Android builds | Capacitor plugin |
| **Performance Monitoring** | Web vitals, load times | `firebase/performance` import |
| **App Distribution** | Beta APK distribution | Firebase Console |

---

## Migration Checklist

- [ ] `npm install -g firebase-tools`
- [ ] `firebase login`
- [ ] `cd functions && npm install`
- [ ] `npm run firebase:emulators` — test locally
- [ ] `npm run firebase:deploy` — first deploy
- [ ] Firebase Console → Hosting → Add custom domain (`skunked.io`)
- [ ] Update DNS records (swap Netlify/Cloudflare CNAME → Firebase)
- [ ] Add GitHub secrets (`FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_TOKEN`)
- [ ] Push to `main` — verify CI/CD auto-deploys
- [ ] Test leaderboard: submit score, verify it shows up
- [ ] (Optional) Remove Netlify/Cloudflare config once Firebase is confirmed live
