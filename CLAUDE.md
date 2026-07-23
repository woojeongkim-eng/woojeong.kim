# woojeong.kim — Kim Woojeong Portfolio (Signature)

Static single-file site (`index.html` + `support.js` + `uploads/`) built with a custom component framework (`class Component extends DCLogic`, `sc-if`/`sc-for` template tags). No build step — `index.html` is served as-is.

## Hosting

- Live site: https://woojeong-kim.vercel.app/ (Vercel auto-deploys on every push to `main`)
- GitHub Pages is configured in the README but is disabled in repo settings — it is not actually used. Don't enable it or treat it as the live URL.

## Known history / past fixes (don't redo or regress these)

1. Non-ASCII filenames broke on macOS Safari (404s). Folders/files with Korean text, spaces, or accents (e.g. `Pure Glacé`, `The Atelier`, `portre_5304 (배경 수정).jpg`) were renamed to ASCII-safe kebab-case (`Pure-Glace`, `The-Atelier`, `portre_5304-baegyeong-sujeong.jpg`, romanized video filenames, etc.). `index.html` paths were updated to match. Check actual filenames in `uploads/` before writing new `src` paths — don't assume the "obvious" name.

2. Images were huge (~3.5GB). Compressed to ~340MB total: resized to max 2000px, JPEG quality 80. If new raw images get added, compress them the same way before committing — don't push multi-GB uploads.

3. Three gallery entries were silently dropped from the very first deploy (Tint Glow Jour / Pure Layer Cushion Glow / Pure Glacé — `photo-16/17/18`), even though their images were already in `uploads/`. Fixed by inserting just those three objects into the photo array (between `photo-15` Hand Cream Nouveau and `photo-19` Promotion) — not by overwriting the whole file.

## Critical gotcha: never blindly overwrite index.html

When the user hands over a fresh `index.html` export (from their design tool) to "redeploy," do not just copy it over the existing file. Fresh exports regenerate from an earlier source state and will regress everything in the list above (reintroduce non-ASCII filenames, undo mobile-layout fixes, etc.).

Instead: diff the fresh export against the currently deployed `index.html` (or an early "core files" commit) to see what's actually new. Port over only the genuinely new content, translating any paths to match the already-renamed/compressed files actually sitting in `uploads/`. Verify `uploads/` already has everything referenced before assuming a re-upload is needed — check first, most of the time nothing new needs to be added.

## Git push: no local credentials

This machine has no git credential helper / SSH key / `gh` CLI configured for GitHub, so `git push` fails with "could not read Username." Don't ask the user for a token. If a logged-in GitHub browser session is available, edit the file directly via GitHub's web editor (`/edit/main/<path>`) — for small targeted changes, use the editor's Find/Replace panel to splice in exact content rather than retyping the whole file, then use "Commit directly to the main branch."

## Repo size note

`.git` history is ~3.5GB (retains the original uncompressed image blobs from early batch commits) even though the current working tree is small. This is expected — no need to try to shrink history.
