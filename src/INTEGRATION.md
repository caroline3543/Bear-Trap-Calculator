# Putting the Time Hub into the Bear Trap Calculator

The Time Hub is one folder: `src/timehub/`. It adds the bottom tab bar
**Today · Timers · Events · BT Calculator** and shows your existing calculator in the last tab.
No new packages are needed (only React, which the calculator already uses).

## 1. Upload the folder (GitHub website)
1. Open the `Bear-Trap-Calculator` repo → go into the `src` folder.
2. If there is already a `src/timehub` folder from the earlier add-in, delete it first
   (open it → ⋯ → Delete directory → Commit).
3. **Add file → Upload files**, drag in the whole `timehub` folder from this zip, then **Commit changes**.
   The files must end up at `src/timehub/...` (e.g. `src/timehub/TimeHub.jsx`).

## 2. Show the calculator inside the tabs (one small edit)
Open the file that returns the calculator page (usually `src/App.jsx`) and:

```jsx
// at the top, with the other imports
import TimeHub from "./timehub/TimeHub.jsx";
```

Then, where the component returns its page, keep everything it returned before in a
variable and hand it to the Time Hub:

```jsx
const calculatorPage = (
  /* ← everything App used to return, unchanged */
);

return (
  <TimeHub
    lang={lang}                 // the calculator's language code: "en", "it", "es", "ko", "de", "ru", "pl", "tr" or "ar"
    calculator={calculatorPage} // becomes the "BT Calculator" tab
    headerExtra={<>{/* optional: your language picker and Dark button */}</>}
  />
);
```

`lang` is a placeholder — use whatever name your App already has for the chosen language.
Keep your `dark` class where it is now; if it sits on the element you moved into
`calculatorPage`, wrap the return instead: `<div className={dark ? "dark" : ""}><TimeHub … /></div>`
so the Time Hub tabs switch to dark mode too.

## 3. Commit
Vercel rebuilds automatically. Open the site: Today is the first tab; the calculator is the last.

## Notes
- Styling uses the calculator's own CSS variables and fonts, so both halves match.
- Everything is saved in the browser (`timehub:v1`); the calculator's saved data is untouched.
- The Time Hub has its own account list (up to 4) under ⚙ → Accounts.
- Not sure where to make the edit? Paste your `App.jsx` into the chat and ask for the exact change.
