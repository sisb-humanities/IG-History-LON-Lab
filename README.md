# League of Nations Lab (G9 IGCSE History)

Static site: no build step, no dependencies. Five lesson pages plus a hub.

## Host on GitHub Pages
1. Create a repository (e.g. `g9-league-lab`) and upload everything in this folder (drag and drop works on a Chromebook).
2. Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
3. After a minute the site is at `https://<your-org-or-user>.github.io/g9-league-lab/`.

## Editing
Each `lessonN.html` is a content config passed to `LAB.start()`. Components are in `assets/lab.js` and the look is in `assets/style.css`.
Change text in the config; no other file needs touching.

## Notes
- Students write in notebooks. Nothing typed or tapped is saved.
- Optional tracking: if `window.SISB_TRACKER` exists (load your tracker script before `assets/lab.js`), the pages call `SISB_TRACKER.log("G9 HIST LON", action, detail)`. Without it nothing happens.
- No textbook scans are included. Add your own images as local files if you want them.
- The SISB logo is `assets/sisb-logo.png`.
