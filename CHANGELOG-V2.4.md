# V2.4.0

- Google popup authentication and Auth-state restore, optional Firebase config, safe local fallback.
- Clients and multiple plans per user with basic client creation/rename/archive and plan selection/upload UI.
- Immediate local save, 1.5-second Cloud debounce, offline pending edits and reconnect reconciliation.
- Transaction preconditions use revision and server updatedAt; conflicts require an explicit decision. Recovery copies precede replacements.
- Login never uploads existing local data without confirmation. New/demo/import/clear and account changes detach the active Cloud plan.
- Backup/import moved into Settings with plain-language labels. Existing JSON schema 6 and local key remain compatible.
- User-owned Firestore paths and restrictive Rules; emulator tests deny anonymous/cross-user access and invalid writes.
- Existing calculation tests plus 13 sync-controller tests and Rules Emulator test pass locally. Local Chromium binary is unavailable; GitHub Actions runs existing UI checks and added Settings/backup checks before deployment.
- Firebase production OAuth and cross-device sync require the user's Firebase project configuration and are not yet verified. Read CLOUD-SYNC.md.

## Bonus income
- Added “เพิ่มโบนัส” to monthly salary entries. Bonus uses a separate annual income with its own receipt month, net/gross cash amount and annual taxable gross/withholding.
- Clarified that salary annual tax totals exclude any bonus entered separately; existing saved plans are preserved.
- Added UI calculation/backup and browser persistence coverage.
