# Bear Trap Squad Calculator

A mobile-first Whiteout Survival Bear Trap rally planner — splits T10/T9 troops across a Rally Leader squad and joiner squads using Manual, Recommended, or Tiered strategies. Pure client-side React app, no backend, no login, nothing leaves the browser.

## Project structure

```
bear-trap-app/
├── index.html          entry HTML
├── package.json        dependencies + scripts
├── vite.config.js       build config
├── .gitignore
├── README.md            (this file)
└── src/
    ├── main.jsx         React mount point
    ├── App.jsx          the calculator (all logic + UI)
    └── index.css        base reset
```

## Option A — Deploy via GitHub + Vercel dashboard (recommended)

This is the same flow used for your State 3543 Command Center app.

1. **Create a new GitHub repo** (e.g. `bear-trap-calculator`), and push this folder to it:
   ```bash
   cd bear-trap-app
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/bear-trap-calculator.git
   git push -u origin main
   ```
2. Go to **vercel.com** → **Add New Project** → **Import Git Repository** → select the repo you just pushed.
3. Vercel auto-detects the **Vite** framework preset — leave the build settings as-is:
   - Build command: `vite build`
   - Output directory: `dist`
4. Click **Deploy**. You'll get a live URL like `bear-trap-calculator.vercel.app` within a minute.
5. Any future `git push` to `main` automatically redeploys.

## Option B — Deploy directly with the Vercel CLI (no GitHub required)

1. Install the CLI once: `npm install -g vercel`
2. From inside the `bear-trap-app` folder, run:
   ```bash
   vercel
   ```
3. Follow the prompts (log in, confirm project name, accept the detected Vite settings).
4. For future updates, run `vercel --prod` from the same folder to push a new live deployment.

## Running it locally first (optional but recommended)

```bash
cd bear-trap-app
npm install
npm run dev
```
Opens at `http://localhost:5173`. Confirm everything looks right before deploying.

## Notes

- No environment variables, API keys, or backend services are needed — this is a fully static app.
- **Data persistence**: all calculator state (troop counts, strategy choices, accepted fills, everything) is automatically saved to that browser's `localStorage` and reloaded on your next visit. Nothing is sent to a server — it stays on that one device/browser only. Clicking "Reset" clears the saved data along with the on-screen state.
- If you clear your browser's site data, use a different browser, or switch devices, the saved state won't follow — it's local to that one browser.
- If you want a custom domain later, add it under the Vercel project's **Settings → Domains** tab.
