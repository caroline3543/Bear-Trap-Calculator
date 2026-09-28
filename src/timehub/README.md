# Time Hub · Arctic expedition journal — design handoff

This is the approved direction (mockup row 4). The interface stays crisp; a painted "field journal"
world sits beside and behind it, never under text or on a control.

## What's in the folder
| Folder | What it is |
|---|---|
| `mockups/04-expedition-journal/` | The approved boards as standalone HTML (open `mockups/index.html`). Needs internet for Google Fonts. |
| `mockups/01…03/` | The earlier green, Arctic-layer and identity-pass directions, for reference. |
| `assets/raster/*.webp` | **What the app should ship.** Pre-rendered at 2× (252 KB total). |
| `assets/raster/*.png` | Same images as PNG, for Figma or other tools. |
| `assets/svg/*.svg` | Sources. The painted ones use SVG filters for the texture: view in a browser; **Figma will not import the filters**, so use the PNGs there. Markers, crystal, ice floe, paw, night mark and ripple rings are plain SVG and safe everywhere. |
| `tokens/journal.tokens.css` / `.json` | Colours, radii, spacing, type, tap sizes, gap scale, motion. |
| `source/` | The Python generators for every board and asset, if you want to change or regenerate anything. |

## The two layers
1. **Functional UI**: crisp. Buttons, inputs, timeline, data, cards, navigation, status. No texture.
2. **Field journal world**: painterly. Bears, landscapes, water, snow, section flourishes, empty states.
   Texture lives only here.

Working screens are about 75–80% UI. Immersive moments (onboarding, empty day, overnight, recap) may reach 40–60% painting.

## Type: three voices
- **UI:** Inter. Body 16/23/450, metadata 14/20/500, buttons 16/600, tabular numerals for times.
- **Display:** Nunito. Page title 32/36/700 (-0.4px), section 24/30/700, countdown 36/42/800.
  (Figtree and Bricolage Grotesque were tested and rejected; see `JnType.html`.)
- **Handwriting:** Kalam, 15–18px, colour `--th-hand`. One to three notes per screen, never on
  buttons, navigation, times, warnings or instructions.

## Illustrations (`assets/raster`)
Seven bear scenes: floating, peeking, distant, sleeping, walking, looking, night. Plus
`header-landscape` (behind the Today/Timers title, fades into the page), `onboarding-scene`,
`hero-pool-corner` (Bear Trap card corner), `furnace-vignette` (training card corner), `snow-edge`
(the one painted section transition per screen), and bear heads (calm, curious, sleepy) and a side view.

The bears and scenes are drawn in code with rough edges and grain. They read as painted, but a real
illustrator should repaint them using these as the brief. The baked grain is slightly softer than the
live mockups.

## Component list (to build as small reusable pieces)
`<PolarBear variant>`, `<ArcticRipple>`, `<SnowDrift>` (snow edge), `<PawTrail>`, `<FireCrystal>`,
`<FurnaceGlow>`, `<ArcticHorizon>`, `<IceFloe>` (active tab), `<ArcticNight>`. The timeline markers
are plain SVG: paw = Bear Trap, flame = training running, spark = minister boost, crystal = fire
crystal event, circle = everything else, dashed circle = personal task.

## Mapping onto the current code (`src/timehub/timehub.css`)
| Existing variable | Token |
|---|---|
| `--cardBgT` | `--th-surface` |
| `--inputBg` | `--th-ice` |
| `--cardBorderT` | `--th-border` |
| `--ink` / `--sub` | `--th-text` / `--th-text-2` |
| `--gold` (most buttons) | `--th-deep` (primary), lime is gone; warm is only for training/boosts |
| `--amber` / `--statusT9Bg` | `--th-warm` / `--th-warm-surface` |
| `--teal` | `--th-arctic` |

Scope the new values to the Time Hub tabs only (for example `.th-root:not(.is-calc)`) so the
Calculator tab keeps its own theme until you decide to move it. Dark mode has no design yet.

## Rules that must not be broken
- **Performance:** ship WebP/PNG, never live SVG filters. Live filters made the earlier paper-grain
  overlay take about a second to redraw on iPhone. No CSS `filter`, `backdrop-filter` or blur.
- **Motion** (ripple once, furnace breathe, all under 5s) must stop under `prefers-reduced-motion`.
- **Contrast:** secondary text is `#5B7075`, not the brief's `#71868B` (about 3.9:1). Warm amber
  `#F2A65A` is never used as text; use `#8A5210`. `--th-text-3` is for icons only.
- **Timeline gaps:** 12–96px, perceptual (30m 16, 1h 24, 2h 40, 4h 64, 6h+ 96). This replaces the
  current 40–220px in `lib/plan.js`. Gaps under about 40px show the label only; the Add task
  button appears from about an hour.
- **Fonts for store builds:** self-host Inter, Nunito and Kalam (the tokens file loads them from Google Fonts).
- Nothing here changes calculations, schedule logic, training logic, data or navigation.

## Not included yet
The app code itself. These are design files. The next step is the visual audit against the current
components, then swapping the shared variables, then the new components.
