# Bear Hive · officer hive and attendance planner

A buildless, browser-local Bear Trap hive planner for R4+ use. Serve `dist/`.

## Features
- Dual-trap city map with touch navigation, top-down/isometric views, manual assignments, collision checks, locked cities and row-two preference for fast whales.
- Bulk roster format `[ALLIANCE] Exact username, player ID, code`. Codes f/Frequently, s/Sometimes, r/Rarely, u/Unknown. Blank or omitted code is Unknown. Imports review ID-based updates and preserve Unicode names and existing assignments.
- Attendance tab replaces the rally-wave tab. Navigate each BT’s two-day cadence; no event is counted merely because its date was generated.
- Paste participant names or IDs and review exact/similar roster matches. Duplicate names are ambiguous; fuzzy matches require manual selection. Optional confirmed spelling aliases improve later matching.
- Screenshot OCR runs locally with vendored Tesseract.js 6.0.1 and core 6.0.0. English, Korean, Russian, simplified Chinese and Arabic data included. Crop per screenshot; run sequential recognition; edit extracted text; review roster matches. Screenshots are not uploaded or saved in the plan.
- Partial lists confirm positives only. Officers explicitly complete the participant list and its eligible roster. Only finished, complete sessions affect frequency, and late recruits are not retroactively marked absent.
- Configurable defaults: most recent 10 complete events per trap, 3 eligible records before auto classification, Frequently >=70%, Sometimes >=30%, otherwise Rarely. Manual codes remain fallback below the evidence minimum.
- Evidence-backed allocation suggestions use calculated attendance without destroying manual fallback records.
- Move instructions name real adjacent players with declared top-down orientation. R4 relocation tracking, roster/attendance CSVs, PNG maps, undo/redo, backups/recovery and dark mode.

## Limits
Private Site audience is preserved. No game API, automatic in-game rank verification, shared database or cross-device syncing. Download backups to move devices.

Coordinates use an unverified 2×2 city / 3×3 trap model; check origin and scale in game before teleporting. Territory connectivity is not validated. March observations are reference data, not travel predictions. Rally scheduling has been removed from the interface; historical schedule data remains in old backups for compatibility.

Screenshot OCR cannot guarantee accuracy for stylised names, symbols or small text. Always review roster matches. Browser/touch testing was unavailable in the build environment. A synthetic image was successfully recognised using the bundled engine/core and English data in Node; this does not establish accuracy on real game screenshots or phone browser compatibility.

## Verification
- `node --check dist/app.js`
- `node --check dist/operations.js`
- `node --check dist/ocr.js`
- `node test/model.test.cjs`
- `node test/attendance.test.cjs`
- `node test/ui-smoke.cjs` (DOM-contract smoke check, not a browser)

OCR dependencies: https://github.com/naptha/tesseract.js and https://github.com/naptha/tesseract.js-core. Bundled models are from @tesseract.js-data 1.0.0 / 4.0.0. Keep bundled licence notices with the distribution.

## Vercel deployment

Set Root Directory to `bear-hive-planner`. Framework: Other. Build: `node scripts/fetch-ocr.mjs`. Output: `dist`. No npm packages or runtime secrets are required. The build downloads version-pinned OCR assets and verifies each SHA-256 against `scripts/ocr-assets.json`; recognition remains entirely on-device.

The source lives alongside the calculator as an independent project. Browser-local data from the former ChatGPT Site does not automatically transfer to the Vercel origin; export a backup on the old site and restore it on the new one.
