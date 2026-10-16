# Time Hub layout redesign

Changes to the existing Bear Trap Calculator and Time Hub, adapted from the Polar Field Journal preview at the user's request.

## Direction

Warm paper, deep pine and glacier blue. The original Fredoka heading and Nunito Sans interface fonts are retained, including the existing Google Fonts import. The original app title is retained, with Time Hub branding in the navigation.

The central design goal is a clear next action with less competing decoration. These are usability hypotheses, not claims of clinical benefit for ADHD.

## Screen changes

| Area | Result |
| --- | --- |
| Navigation | Desktop sidebar; five-item phone dock with safe-area spacing; selected page; keyboard focus; skip link |
| Timeline | Full schedule expanded on every fresh app mount; optional collapse applies only to the current session. Real task and timer totals link to the respective pages. |
| To do | Full available width, quieter groups and task rows, differentiated Minimum Day and focus surfaces |
| Timers | Training and research in the main column; daily resources alongside; section shortcuts expand collapsed sections |
| Events | Calendar and bookings in the main column; sharing and history alongside |
| Calculator | Four section shortcuts, a non-sticky summary, consistent forms, cards and results |
| Settings | Account management, preferences and tracking grouped in a responsive grid |

## Preservation

No calculation, task, timer or account storage model was changed. Existing inventory scans, bonus scans, hero comparisons, mixed-tier recommendations, account-specific saves, task capture, Today/Everything, routines, focus, pause/resume, completion Undo, deadlines, history, sharing, language and theme controls remain available.

A separate preview origin has its own browser local storage. Existing production data does not automatically appear in a preview. The source contains no Castle Command module, so none was invented.

## Foundations

| Token | Light | Dark |
| --- | --- | --- |
| Page | #F4F1E8 | #111D19 |
| Surface | #FFFDF8 | #1B2B24 |
| Text | #233D35 | #EDF2E8 |
| Secondary text | #596B62 | #B4C2B7 |
| Selection | #24443C | #C5D9C6 |
| Selected text | #FFFDF8 | #14271D |

Logical layout properties preserve RTL direction. Main navigation wraps long labels. Inputs retain 16px text. Shared buttons and fields retain 48px minimum height; reduced-motion preference disables decorative animation. New responsive breakpoints are 1100px for the navigation dock and 760px for single-column tools.

## Verification

- Production build passes. Vite still reports large existing JavaScript chunks.
- All 345 calculation, task, scheduling and localization tests pass.
- Task integration passes: capture, small versions, focus, Undo, pause/resume, Today/Everything and hidden-panel accessibility.
- Shared interface integration passes: five unique headers, one account selector, account switching, isolated saves, keyboard toggles and Escape.
- Added integration checks exercise the daily-brief shortcuts, expanding section shortcuts, calculator targets, settings targets and returning from settings through navigation.
- No browser screenshot or physical-device layout check was available for this release. Native iPhone keyboard, text scaling, safe-area and screen-reader behavior require device review. DOM integration is not a substitute for those checks.
- Existing workflow translations are retained. New introductory chrome currently uses English fallback in the other supported languages.

## Review before production

Review the preview at phone and desktop sizes, including a populated timeline, Minimum Day, paused focus, long task names, multiple accounts, calculator results, dark mode and a non-English locale. The user authorized applying the selected layout changes to the existing GitHub app, retaining its fonts and expanding the timeline by default.
