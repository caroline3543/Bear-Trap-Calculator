# Bear Hive · officer hive and attendance planner

A buildless, browser-local Bear Trap hive planner for R4+ use. Serve `dist/`.

## Features
- Dual-trap city map with direct city dragging, grid snapping, valid/invalid drop previews, edge panning, locked cities, precise tap-based movement and top-down/isometric views.
- Compact layout moves city positions; Suggest assignments ranks players by attendance without changing geometry. Reset layout restores a valid default template for the selected trap, preserving history, terrain, structures, locks and the other trap. Every operation is previewed and undoable.
- Alliance tags remain metadata and import data, rather than primary labels. Obsolete whale/speed/role settings are ignored; old backups remain compatible.
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

Screenshot OCR cannot guarantee accuracy for stylised names, symbols or small text. Always review roster matches. Interactive flows were tested in real headless Chromium at desktop and 390×844 phone-sized viewports, with simulated touch input for city dragging and panning. The browser OCR worker recognised a synthetic participant screenshot, and the reviewed results were saved/deduplicated through the actual interface. This does not establish accuracy on arbitrary game screenshots or physical iPhone Safari compatibility. Production-page access remains subject to Vercel sign-in protection.

## Verification
- `node --check dist/app.js`
- `node --check dist/operations.js`
- `node --check dist/ocr.js`
- `node test/model.test.cjs`
- `node test/attendance.test.cjs`
- `node test/layout.test.cjs`
- `node test/ui-smoke.cjs` (DOM-contract smoke check)
- `npm run test:browser` (requires Playwright and Chromium; serves the app on an ephemeral local port). Use `HIVE_PLAYWRIGHT_PATH` to select an externally installed Playwright module if needed.

OCR dependencies: https://github.com/naptha/tesseract.js and https://github.com/naptha/tesseract.js-core. Bundled models are from @tesseract.js-data 1.0.0 / 4.0.0. Keep bundled licence notices with the distribution.

## Vercel deployment

Set Root Directory to `bear-hive-planner`. Framework: Other. Build: `node scripts/fetch-ocr.mjs`. Output: `dist`. No npm packages or runtime secrets are required. The build downloads version-pinned OCR assets and verifies each SHA-256 against `scripts/ocr-assets.json`; recognition remains entirely on-device.

The source lives alongside the calculator as an independent project. Browser-local data from the former ChatGPT Site does not automatically transfer to the Vercel origin; export a backup on the old site and restore it on the new one.
