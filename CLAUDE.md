# woojeong.kim — Kim Woojeong Portfolio (Signature)

Static single-file site (`index.html` + `support.js` + `uploads/`) built with a custom component framework (`class Component extends DCLogic`, `sc-if`/`sc-for` template tags). No build step — `index.html` is served as-is.

## Hosting

- Live site: https://woojeongkim-portfolio.vercel.app/ (Vercel auto-deploys on every push to `main`). Note: the old `woojeong-kim.vercel.app` URL noted below 404s now — the Vercel project's domain was renamed/changed at some point. Verify the live URL with the user if it ever seems wrong rather than trusting this file blindly.
- GitHub Pages is configured in the README but is disabled in repo settings — it is not actually used. Don't enable it or treat it as the live URL.
- Sibling repo: `woojeongkim-eng/woojeongkim-archive`, live at https://woojeongkim-archive.vercel.app/. Same template family, gates project/career sections behind a passcode. The user (woojeongkim-eng) typically wants changes applied to **both** repos — always ask/confirm scope ("archive만 / portfolio만 / 둘 다") before assuming one vs both.

## Home-page main-visual rebuild: 3 discarded WebGL attempts, then a 4th approach that stuck — see branch `home-nav-circle-line`

The user repeatedly asked to rebuild the home page's floating photo collage. The first three attempts tried to recreate a michaelgatt.com-style WebGL parallax scene and were all discarded (see below — don't retry that specific approach without much more specific feedback). The user then gave a **new, concrete reference** (https://aikawakenichi.com/) and the ask changed shape entirely: replace the collage with a 3-category (Profile/Project/Archive) nav element that's either a real 3D rotating cylinder (drag to spin) or a horizontal-scroll line, toggled by a CIRCLE/LINE switch. This one worked and is live on branch **`home-nav-circle-line`** (not yet merged to `main` — the user has been previewing each Vercel preview-branch URL and asking for adjustments, not approving a merge yet). Check that branch's latest commit before starting new home-page work; don't rebuild from `main` and lose this.

Key implementation points on that branch (in `home-nav.js`, a new file, plus small `index.html` edits):
- Three.js scene mounted once to `document.body` (outside the framework's re-rendered tree — same lesson as the failed attempts below), synced every frame to the `.pf-float-wrap` anchor's `getBoundingClientRect()`.
- Category labels are baked directly onto each photo's canvas texture (centered, italic serif matching the site's `archiveTitleStyle` font), not a separate floating overlay.
- A rotation-offset bug (each panel's true center sits at `i*step + step/2`, not `i*step`) caused the default view to center on the seam between two panels — fixed in `frontIndex`/`settleRotation`/`goToCircle`.
- The circle/line element's vertical clearance is computed dynamically each frame from the actual rendered height of the title block (`#pf-home-title`), not a fixed CSS offset — a fixed offset either overlapped the title on wide desktop or left a huge gap on tall mobile.

### The three discarded WebGL-collage attempts (don't retry this approach without much more specific feedback than "make it like the reference")

1. **Attempt 1** (prior session): lighter CSS-3D-only version (`perspective` + `translateZ` for depth-scale/blur, slight mouse-driven `rotateX/Y`, no real WebGL). Discarded entirely at the user's request — branch deleted, nothing committed.

2. **Attempt 2**: full WebGL rebuild via Three.js (`EffectComposer`/`RenderPass`/`BokehPass`, canvas replacing the old tile loop, camera-driven parallax, real particles). Pushed to branch `webgl-home-experiment`. Complaint: photos "all clustered in one place," visible flicker, barely responded to mouse movement. Root causes: (a) this template engine doesn't reliably apply a literal `style="width:100%"` string on a plain element — size the canvas from JS instead; (b) the home page's `setInterval` (rotates a category label every 2.6s) triggers a full re-render, and this engine recreates DOM nodes on re-render rather than reconciling, so a canvas living *inside* the re-rendered tree gets torn down and rebuilt every 2.6s. **Branch deleted.**

3. **Attempt 3** (`webgl-home-v2`): fixed both root causes from attempt 2 (canvas mounted outside the render tree, synced via anchor rect — this is the pattern that `home-nav-circle-line` later reused successfully), bigger mouse-driven camera movement, wider 3D spread. User said it still wasn't it. **Branch deleted, not merged.**

Takeaway from the first three: the gap wasn't the parallax technique or a fixable bug — it was mismatched mood/art-direction, and no amount of iterating on "recreate this reference site" closed it. What actually worked was the user switching to a much more specific, concrete reference (aikawakenichi.com) with an explicit interaction spec (drag-to-rotate circle + line-scroll toggle), not "make it feel like X." If asked to redo the home main visual again, push for that level of specificity before writing code.

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

## "포폴" vs "archive" — the user names the two repos differently than you'd guess

The user calls `woojeong.kim` "포폴"/"포트폴리오" (portfolio) and `woojeongkim-archive` "아카이브"/"archive" — as **repo/site names**, distinct from the fact that `woojeong.kim` *also* has its own in-site "Archive" page/section. So "그 포폴" or "portfolio만" = `woojeong.kim` only; "아카이브" or "archive만" or "archive 포폴" = `woojeongkim-archive` only (the "포폴" there is just generic "the site," not a second meaning). When scope isn't stated, ask rather than guess, or check which repo the message's product/campaign names already exist in.

**Current divergence (as of the last session doing archive-tab content work):** `woojeongkim-archive` has newer Archive PHOTO/MODEL/AI content than `woojeong.kim` — specifically Daily Wear Mesh Cushion, White Tomato Crème Mist, and Chuseok-merged-into-Promotion were only pushed to `woojeongkim-archive` (the user's requests were scoped "archive" only). If asked to bring `woojeong.kim` back in sync, the equivalent `realAiFolders`/`photoRealFolders`/`realModelFolders` entries need to be ported over from `woojeongkim-archive`'s `index.html` — check the AI-folder photo/video-split logic below still applies the same way there (it does, both repos share the same `.flatMap` pattern already).

### AI-tab folders auto-split photos from videos (both repos, `realAiFolders`)

A `.flatMap()` step (search for "Photos from a shoot stay bundled") runs before the final `.map()` that builds `thumbEl`/`onOpen`: for each raw folder object, images stay bundled as one card, but each video becomes its own standalone card (so multi-video AI folders don't need an extra click to reach clip 2/3), titled `<Folder Title> · Clip N` when there's more than one video or a mixed photo+video source (` · Image` / ` · Video` when exactly one of each). Add new AI folders to the raw array as a single object with a `media` array mixing types — don't manually pre-split them, the flatMap does it.

## Recurring workflow with this user

The user (woojeongkim-eng) regularly hands over a new folder/zip of raw photos or files and expects it pushed live with minimal back-and-forth. Their stated pattern: they give the folder, say which site(s) it's for ("archive만" / "portfolio만" / "둘 다"), and expect compression + non-ASCII renaming + diffing + `git commit`/`push` to happen without re-confirming each step — treat "here's a folder + site scope" as standing authorization to carry the change all the way to a live push on the site(s) named, following the conventions in this file (don't ask "should I push?" again once scope is given). Still use judgment: if something is genuinely ambiguous (e.g. which folder/category a given photo belongs to, or which specific image within a folder they mean), ask rather than guess — a wrong live thumbnail is a worse outcome than one clarifying question.

They cannot give raw code — they're not a developer. Everything (index.html edits, image compression, git operations) is this assistant's responsibility; the user only supplies files and plain-language direction (e.g. "Pure Glacé 커버를 02번 사진으로 바꿔줘").

If a chat message includes photos as inline attachments (not a folder), there is no way to save those to local disk directly — ask the user to either (a) drop the actual files into a folder ("모델컷 최종본" on their Desktop is the usual source folder for model shoot photos) so they're reachable on disk, or (b) confirm the attached photos are visual references to files *already* in that folder, in which case open and visually compare the folder's candidate files to find the exact match (slow but works — this is how the 9 cover-photo picks in history item 5 above were resolved) rather than guessing from the folder's default ordering.

## Repo size note

`.git` history is ~3.5GB (retains the original uncompressed image blobs from early batch commits) even though the current working tree is small. This is expected — no need to try to shrink history.
