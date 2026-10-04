# CatNayPlan V2.4.0 — Cloud Sync Setup

## Architecture and data integrity

- Static ES modules in `dist/`; no framework migration and no server needed on GitHub Pages.
- `app.mjs` saves the existing schema-6 plan to `fp.plan.v2.3` immediately on valid state changes. This key intentionally remains unchanged for migration. `appVersion` is 2.4.0; schema is still 6.
- `firebase/config.mjs` contains public Firebase Web config. Null disables Cloud safely. `config.example.mjs` is the template.
- `firebase/service.mjs` loads pinned modular Firebase SDK 12.4.0 only when configured; Google popup authentication, Auth refresh persistence, and Firestore client/plan operations.
- `firebase/sync.mjs` is the tested sync controller. Every active plan has a durable local record scoped by uid/clientId/planId and its last acknowledged cloud revision/server timestamp. Local failure blocks Cloud writes.
- `cloud-ui.mjs` owns account and client/plan UI under Settings. New/demo/import/clear detaches the Cloud target. Login and account changes never upload a shared local draft automatically. Logout keeps local work and clears Cloud binding.
- Local input → local save → per-plan local record → 1.5-second debounce → transactional Cloud save. Network restore attempts one reconcile, not an endless retry loop. Manual retry is available.
- Cloud serverTimestamp is authoritative. A transaction compares BOTH revision and previously read server timestamp before writing. Clean local copies accept Cloud. Pending local edits based on the same revision write normally (last successful write wins). A concurrent changed revision prompts a choice; device timestamps are not used to silently rank conflicting edits.
- Conflict choices preserve a local recovery record, then apply the user's choice. A second concurrent Cloud update still fails the transaction and prompts again. A “latest” button is deliberately omitted when clocks cannot safely prove which edit was last.
- Opening a plan on refresh is explicit: login lists clients; choose client and plan. Pending per-plan local edits are restored and reconciled on open. Before first upload, confirm that the current device plan should be sent to the account.
- Each user can have many clients and each client many plans. The current plan JSON is stored intact as `data`, not split into field collections.

```text
users/{uid}/clients/{clientId}
  name, archived, createdAt, updatedAt
users/{uid}/clients/{clientId}/plans/{planId}
  planName, data, schemaVersion, revision, createdAt, updatedAt
```

The `users/{uid}` parent document need not exist: Auth supplies account displayName/email/photo. No additional profile copy is stored.

Services: createClient, getClients, updateClient, archiveClient, createPlan, getPlans, loadPlan, savePlan. Archiving preserves plans; unarchiving is supported by updateClient({archived:false}), but not yet exposed in basic UI.

## Setup step by step

1. Open https://console.firebase.google.com/ and create a project. Analytics is optional and not used by this app.
2. Project settings → Your apps → Add app → Web (`</>`). Register CatNayPlan.
3. Copy the Firebase configuration fields into `dist/firebase/config.mjs`, following `config.example.mjs`. Replace `null` with the object. Do not paste a service-account/private key.
4. Build → Authentication → Get started.
5. Sign-in method → Google → Enable; choose a support email and save.
6. Authentication → Settings → Authorized domains: add `byourwealth1-nay.github.io` (no scheme, path or `/CatNayPlan/`). Also add your custom hostname if used. Add `localhost` for local testing if absent.
7. Build → Firestore Database → Create database → choose a location and **Production mode**. Do not enable public/test-mode rules.
8. Install Node.js 22 and Java 21 for the Rules Emulator. In the repository root run:
   ```sh
   npm ci
   npm run build
   npm test
   npm run test:rules
   ```
9. Authenticate Firebase CLI and publish the supplied rules to YOUR project:
   ```sh
   npx firebase login
   npx firebase use --add
   npm run deploy:rules -- --project YOUR_PROJECT_ID
   ```
   Alternatively paste `firestore.rules` into Firestore → Rules → Publish. Verify the project ID first. Never deploy emulator test data to production.
10. Commit the public Web config to GitHub. The existing Actions workflow builds/tests and publishes `dist/` after all checks pass. Set Pages source to GitHub Actions. This workflow does not deploy Firebase rules; step 9 is required separately.
11. Open the website → Settings / Account → Sign in with Google. Allow the popup. `authDomain` stays the Firebase-provided hostname; this static site does not implement Firebase `/__/auth` helpers and does not fall back to redirect sign-in.
12. Add a client; enter a plan name; choose “บันทึกขึ้น Cloud เป็นแผนใหม่” and confirm. Edit a value and wait for “ซิงก์แล้ว”. Check the document under your uid in Firestore Console.
13. On a second device sign into the same Google account, select the same client and plan, and open it. Confirm the values. Edit on both devices before syncing to exercise the conflict choice.
14. Switch to another Google account and verify it has its own client list. Local data remains on this browser after logout; on a shared device export your backup and clear local browsing data when finished.

## Local/Mac checks

Terminal 1 (repository root):
```sh
npm ci
npm run build
npm test
npm run test:rules
npx playwright install chromium
python3 -m http.server 8000 --directory dist
```
Terminal 2 (same directory):
```sh
npm run test:browser
node tests/v24-browser.cjs
```
Screenshots: `test-artifacts/`. Rules tests use the demo project `demo-catnayplan`; no production credentials required.

## Security and limitations

- Rules require authenticated uid ownership on every allowed path, validate top-level structure, server timestamps, monotonic revision and immutable creation timestamp. All other paths and deletes are denied. Archived clients reject plan writes.
- Browser SDK has no admin key; no financial plan data is logged to console. Web config/apiKey is public; Rules are the data boundary.
- Blank/invalid plans are never uploaded; individual plans over 750 KB are rejected before Firestore's document limit. Backups still work locally.
- No real Google/Firebase integration can be certified until your config/provider/domain/rules have been set. Controller tests use a fake remote; Rules tests use the real Firestore emulator; neither proves production OAuth configuration.
- Offline editing works once the page is loaded. V2.4 does not include a service worker and does not promise a cold browser launch or hard refresh without internet. Local data survives and restores once the page can load again.
- No live Cloud subscription: open/retry/reconnect pulls Cloud; each write transaction detects remote changes. Multiple tabs pause sync when shared storage changes; use one editing tab per browser.
- Local Storage is device-local and not encrypted by this app. Local draft/recovery keys persist after logout. Recovery snapshots use `catnay.recovery.*` and `catnay.v24.*.recovery.*`; preserve them before clearing browser data. The basic UI does not yet include a recovery-history browser.
- No destructive client/plan delete UI. No admin sharing/collaboration between planners.

Official SDK references:
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/security/test-rules-emulator
