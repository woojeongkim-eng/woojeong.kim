# Deploy: Kim Woojeong Portfolio (Signature)

This folder is a static website (already-built HTML/JS/images), ready to push to the existing GitHub repo `woojeongkim-eng/woojeong.kim` and serve via GitHub Pages.

## What's here
- `index.html` — the whole site (single-file component, renders everything)
- `support.js` — runtime the site depends on (must stay next to index.html)
- `uploads/` — all images/videos referenced by the site

## Task for Claude Code
1. Open a terminal in this folder.
2. If the repo `woojeongkim-eng/woojeong.kim` is not already cloned locally, clone it:
   `git clone https://github.com/woojeongkim-eng/woojeong.kim.git`
3. Copy `index.html`, `support.js`, and `uploads/` into the root of that cloned repo (overwrite existing files/folders).
4. In the repo folder, run:
   ```
   git add .
   git commit -m "Deploy portfolio site"
   git push origin main
   ```
   If push fails/times out partway through (common with ~170MB of images), retry with:
   ```
   git push origin main
   ```
   a few times — git resumes from where it left off. If it keeps failing, split into smaller commits: add and commit a subset of files in `uploads/` at a time (e.g. `git add uploads/A* uploads/B*`, commit, push, then the next batch), rather than committing everything at once.
5. Once pushed, confirm GitHub Pages is enabled: repo Settings → Pages → Source: Deploy from a branch → Branch: `main`, folder: `/(root)`.
6. Site will be live at `https://woojeongkim-eng.github.io/woojeong.kim/`.

## Notes
- Do not rename `uploads/` or move `support.js` — `index.html` references both by relative path.
- No build step needed — this is a fully static, ready-to-serve site.
