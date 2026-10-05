# CatNayPlan V2.6 — Guided planning and follow-through

## Changes

- Two views share the same plan: guided entry and editing all sections. Guided entry splits finance into purpose, profile, income, expenses/debt and assets, then continues through protection, goals, retirement, optional tax and the report.
- Multiple planning priorities and an optional personal reason, stored with the plan.
- Cream background, wine accent, clearer inputs, local Thai fonts, responsive summary next to forms on desktop and collapsible summary on mobile.
- Retirement assumptions are collapsed in guided mode. Current-money spending and future spending remain distinct. Invalid retirement ages are indicated at the input.
- Financial situation summaries distinguish cash, investments, personal assets, net worth, reserves and money left before/after saving. Ratios state their denominator and do not assign an unexplained score.
- Up to three next actions based on data completeness, cash deficit, reserve target, debt and goal gaps. Suggestions do not change the financial model automatically.
- Editable action items with amount, owner, target date and status. Up to 100 actions.
- Up to 120 dated financial observations, including net worth, debt, reserves, monthly saving and a note. These are snapshots of user-entered data, not bank-verified transactions or investment returns.
- Scenario comparison for reducing one monthly expense, increasing retirement savings, paying extra on a supported reducing-balance loan, and changing retirement age. Preview is isolated, explicit application is undoable, and stale previews cannot overwrite subsequent edits.
- Example mode keeps the real plan in local storage unchanged, detaches the cloud plan, does not publish example edits, and returns to the real plan on exit or refresh. Exporting the example is allowed. New/import/clear commands require leaving example mode first.
- Presentation mode hides editors. Its default privacy option hides the detailed original report and action details. Unchecking it permits the normal report and action summary to be displayed.
- Loan summary includes an approximate payoff month based on the assessment date, fixed annual interest / 12 and end-of-period monthly payments.

## Compatibility and data

The existing schema 7 financial fields and tax engine remain in use. Optional `review.planner` adds focus, reason, action items and observations with import validation. V2.5 plans continue to load. Use V2.6 when editing V2.6 backups; older clients do not expose or validate the new planner fields.

The 2567 spreadsheet was a layout reference only. No tax thresholds or deduction rules were copied from it. No attached customer names, workbook records or PDF text were embedded in the website. The existing tax audit remains the authority for the implemented tax scope.

## Validation

Passed locally on 5 October 2026: build, complete unit/sync suite and all four Chromium browser scripts. The final report-layout adjustment was followed by another passing V2.6 browser run. Thai fonts and desktop/mobile screenshots were visually inspected.

- `npm run build`
- `npm test`: existing model, tax, migration, UI harness and sync tests, plus V2.6 scenario isolation, cash reconciliation, missing-data guards, payroll-saving treatment and backup validation.
- Browser checks: `tests/browser-check.cjs`, `tests/v24-browser.cjs`, `tests/v25-browser.cjs`, `tests/v26-browser.cjs`. Legacy browser fixtures use all-sections mode and load the example as a persisted test fixture; V2.6 separately tests the new isolated example behavior.
- Desktop 1440px, mobile 390px, example exit/reload, action/history persistence, scenario application/undo, presentation privacy and PDF generation are covered by the V2.6 browser test.

## Boundaries still requiring separate work

- Firebase credentials and real cross-device Google sign-in remain owner setup tasks.
- The new observation history is not a daily transaction ledger and does not calculate a complete budget-versus-actual reconciliation.
- Debt simulations support fixed-rate reducing-balance loans. Flat-rate contracts, changing rates, fees, early-settlement penalties and refinancing need contract-specific models.
- Asset sales, employer PVD vesting and insurance surrender value still require explicit source-data review. This release does not add automatic sale transactions, vesting schedules or surrender-value estimates.
- Visual and automated checks do not replace a first-time-user study; that study has not been conducted.
- Deployment targets `byourwealth1-nay/CatNayPlan`. The `codex/v26-interface` branch runs CI before promotion to `main`; GitHub Pages deployment remains gated by successful CI.

## Running locally

```sh
npm ci
npm run build
npm test
npx playwright install chromium
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`. In another terminal, run the four browser scripts above. This workspace used a temporary Chromium package for local verification because the standard Playwright browser download was unavailable; it is not a production dependency.

## Guided flow revision — 5 October 2026

- Replaced the competing 10-step/6-section navigation with five basic stages: profile, income, outgoings, holdings, overview. Detailed editing remains in settings.
- Brought debt payments and existing insurance premiums into outgoings; existing investments, PVD and saving goals are entered under holdings using the same plan records.
- Optional retirement, protection, goals and tax planning start from the overview; scenarios are available only in a collapsed overview panel.
- Added persistent deferred-stage markers and direct overview links back to the relevant stage. Unknown amounts remain unknown.
- Collapsed secondary document fields, removed duplicate focus selection and the distracting live summary, and labelled annual-average cash flow explicitly.
- Fixed expanded-entry state restoration using stable record identity instead of element position.
- Added browser coverage for the complete new journey, deferral/reload/editing, optional planning and mobile/desktop layouts.
