# woojeong.kim — Kim Woojeong Portfolio (Signature)

Static single-file site (`index.html` + `support.js` + `uploads/`) built with a custom component framework (`class Component extends DCLogic`, `sc-if`/`sc-for` template tags). No build step — `index.html` is served as-is.

## Hosting

- Live site: https://woojeongkim-portfolio.vercel.app/ (Vercel auto-deploys on every push to `main`). Note: the old `woojeong-kim.vercel.app` URL noted below 404s now — the Vercel project's domain was renamed/changed at some point. Verify the live URL with the user if it ever seems wrong rather than trusting this file blindly.
- GitHub Pages is configured in the README but is disabled in repo settings — it is not actually used. Don't enable it or treat it as the live URL.
- Sibling repo: `woojeongkim-eng/woojeongkim-archive`, live at https://woojeongkim-archive.vercel.app/. Same template family, gates project/career sections behind a passcode. The user (woojeongkim-eng) typically wants changes applied to **both** repos — always ask/confirm scope ("archive만 / portfolio만 / 둘 다") before assuming one vs both.

## Active experiment: WebGL home page (branch `webgl-home-experiment`, not merged to main)

Rebuilds only the **home page's floating photo collage** (previously 33 DOM `<img>` tiles absolutely positioned with CSS `transform: translate()` parallax driven by `onHomeMouseMove`) as a real WebGL scene using Three.js — same 33 photos (still sourced from `floatThumbSpecs` in `index.html`, now also exposed as `window.__floatThumbSpecs`), but rendered via `three` + `EffectComposer`/`RenderPass`/`BokehPass` (loaded from `unpkg.com/three@0.160.0` via an importmap in `<head>`) in a new file `webgl-home.js`, mounted onto a single `<canvas id="webgl-home">` that replaces the old `sc-for` tile loop. Gives genuine GPU depth-of-field blur, drifting particles, and camera-driven (not per-tile-translate) parallax — closer to the michaelgatt.com reference the user originally asked about. Rest of the site (nav, archive, project pages, etc.) is untouched.

Two real bugs found & fixed while building this, worth knowing if touching `webgl-home.js` or the canvas again:
1. This template engine does not reliably apply a literal `style="width:100%;..."` string on a plain (non-`{{ }}`-bound) element — the canvas rendered at 0 width. Fix: don't set size via the HTML attribute; set `canvas.style.*` from JS in `init()` instead.
2. The old `onMouseMove`/`onTouchMove` handlers were still wired to the home `<main>` element (`onHomeMouseMove` in the component state) — every mouse move triggered `setState`, which re-renders the whole component tree. Removed those attributes from `<main>` since the WebGL module now tracks the mouse itself via its own `window.addEventListener('mousemove', ...)`, independent of the component's re-render cycle.

Testing note: this sandbox's automated browser reports `document.hidden = true` almost constantly (even on the "active" tab), which throttles/stops `requestAnimationFrame` — expect frozen-looking animation and NaN mouse-position math (from `getBoundingClientRect()` briefly returning 0 width mid-transition) when driving it via CDP/automation. That's a testing-environment artifact, not a site bug — verify smoothness in a real, actually-focused browser tab (e.g. the Vercel preview URL) instead of trusting automated screenshots here.

Status: pushed to `webgl-home-experiment`, Vercel generated a preview deployment (gated behind Vercel SSO login — the user needs to be logged into their Vercel account to view it), not merged. This is the second attempt at this idea — an earlier, lighter CSS-3D-only version (perspective + translateZ, no WebGL) was built and tested in an untracked branch in a prior session, then discarded entirely at the user's request (never committed, no trace in this repo). Don't assume either version is wanted on `main`; wait for explicit approval before merging/deploying this as the live home page.

## Known history / past fixes (don't redo or regress these)

1. Non-ASCII filenames broke on macOS Safari (404s). Folders/files with Korean text, spaces, or accents (e.g. `Pure Glacé`, `The Atelier`, `portre_5304 (배경 수정).jpg`) were renamed to ASCII-safe kebab-case (`Pure-Glace`, `The-Atelier`, `portre_5304-baegyeong-sujeong.jpg`, romanized video filenames, etc.). `index.html` paths were updated to match. Check actual filenames in `uploads/` before writing new `src` paths — don't assume the "obvious" name.

2. Images were huge (~3.5GB). Compressed to ~340MB total: resized to max 2000px, JPEG quality 80. If new raw images get added, compress them the same way before committing — don't push multi-GB uploads.

3. Three gallery entries were silently dropped from the very first deploy (Tint Glow Jour / Pure Layer Cushion Glow / Pure Glacé — `photo-16/17/18`), even though their images were already in `uploads/`. Fixed by inserting just those three objects into the photo array (between `photo-15` Hand Cream Nouveau and `photo-19` Promotion) — not by overwriting the whole file.

4. Added a 4th archive tab: `MODEL` (mediaTypes went from `['photo','video','ai']` to `['model','photo','video','ai']`; mediaLabels/archiveCategoryDesc got a `model` entry). 14 model-shoot folders live in `const realModelFolders = [...]`, inserted right before `const archiveFoldersAll = ...` and concatenated in (`.concat(realModelFolders)`). Images are compressed the same way as everything else and live in `uploads/model/`, named `<product-slug>-<n>.jpg` (slug = English product title in kebab-case, not romanized Korean — e.g. `bare-color-balm-ad-1.jpg`, `soft-filter-powder-pact-03.jpg`). Source raws are on the user's Desktop at `모델컷 최종본/`.

5. Folder cover-photo override: every folder-thumbnail construction (`realAiFolders`, `photoRealFolders`, `realModelFolders`, `videoRealFolders`) reads `enc(f.previewImage || f.media[0].src)` — so a folder object can carry an optional `previewImage: 'uploads/.../file.jpg'` to pin its grid-listing thumbnail to something other than the first media item, without reordering `media`. Originally only used by the AI folders; now wired into all four folder types. This is the mechanism to use when the user says "change category X's cover photo to Y."

6. Archive **detail-page** images used to force every photo/video into a cropped `aspectRatio: '9/16'` box (`objectFit: cover`), which badly cropped landscape photos. Fixed: the wrapping div no longer sets a fixed aspect ratio (just `width: '100%', alignSelf: 'start'` so it doesn't stretch to match the tallest item in its CSS Grid row), and the `<img>`/`<video>` use `height: 'auto'` instead of `objectFit: cover`. An `onLoad`/`onLoadedMetadata` handler checks `naturalWidth > naturalHeight` and sets `el.parentElement.style.gridColumn = 'span 2'` so landscape media renders wider instead of tiny-and-narrow or crop-cut. This logic lives inline in the `archiveImages` construction (search for `onWideLoad`) — don't reintroduce a fixed `aspectRatio` there.

## Critical gotcha: never blindly overwrite index.html

When the user hands over a fresh `index.html` export (from their design tool) to "redeploy," do not just copy it over the existing file. Fresh exports regenerate from an earlier source state and will regress everything in the list above (reintroduce non-ASCII filenames, undo mobile-layout fixes, etc.).

Instead: diff the fresh export against the currently deployed `index.html` (or an early "core files" commit) to see what's actually new. Port over only the genuinely new content, translating any paths to match the already-renamed/compressed files actually sitting in `uploads/`. Verify `uploads/` already has everything referenced before assuming a re-upload is needed — check first, most of the time nothing new needs to be added.

## Git push: no local credentials (per machine)

A fresh machine has no git credential helper / SSH key / `gh` CLI configured for GitHub, so `git push` fails with "could not read Username." Don't ask the user for a token — instead install `gh` (`brew install gh`) and run `gh auth login --hostname github.com --git-protocol https --web` in the background, relay the one-time code + https://github.com/login/device URL to the user in chat and ask them to authorize it themselves (don't click "Authorize" for them — that's an OAuth grant, which needs their explicit action). Once `gh auth status` shows logged in, run `gh auth setup-git` and normal `git clone`/`push` over HTTPS works. This is per-machine — redo it on any new computer. Use `git clone --depth 1` (shallow) when cloning; a full clone pulls the ~3.5GB history noted below and can time out.

## Recurring workflow with this user

The user (woojeongkim-eng) regularly hands over a new folder/zip of raw photos or files and expects it pushed live with minimal back-and-forth. Their stated pattern: they give the folder, say which site(s) it's for ("archive만" / "portfolio만" / "둘 다"), and expect compression + non-ASCII renaming + diffing + `git commit`/`push` to happen without re-confirming each step — treat "here's a folder + site scope" as standing authorization to carry the change all the way to a live push on the site(s) named, following the conventions in this file (don't ask "should I push?" again once scope is given). Still use judgment: if something is genuinely ambiguous (e.g. which folder/category a given photo belongs to, or which specific image within a folder they mean), ask rather than guess — a wrong live thumbnail is a worse outcome than one clarifying question.

They cannot give raw code — they're not a developer. Everything (index.html edits, image compression, git operations) is this assistant's responsibility; the user only supplies files and plain-language direction (e.g. "Pure Glacé 커버를 02번 사진으로 바꿔줘").

If a chat message includes photos as inline attachments (not a folder), there is no way to save those to local disk directly — ask the user to either (a) drop the actual files into a folder ("모델컷 최종본" on their Desktop is the usual source folder for model shoot photos) so they're reachable on disk, or (b) confirm the attached photos are visual references to files *already* in that folder, in which case open and visually compare the folder's candidate files to find the exact match (slow but works — this is how the 9 cover-photo picks in history item 5 above were resolved) rather than guessing from the folder's default ordering.

## Repo size note

`.git` history is ~3.5GB (retains the original uncompressed image blobs from early batch commits) even though the current working tree is small. This is expected — no need to try to shrink history.
