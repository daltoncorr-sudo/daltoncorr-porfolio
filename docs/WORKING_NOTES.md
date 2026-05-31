# Working notes — using two laptops

Plain-language notes so anything important travels *with this folder* (the folder
is the only thing that syncs between machines — chat history and any AI "memory"
do NOT travel; this file does, because it gets pushed to GitHub).

---

## The big idea

The website does **not** live on either laptop. It lives on **GitHub**, and
GitHub is the single source of truth. Each laptop is just a working copy.

- **New laptop** — stays home. Pristine, big battery.
- **Old laptop** — travels. Better for working on the go.

Both have an identical copy of this folder. They stay in sync *through* GitHub,
never by copying the folder by hand (USB/AirDrop would break git — don't).

```
   old laptop  ⇄  GitHub (source of truth)  ⇄  new laptop
                       │
                       └── auto-publishes to daltoncorr.com on every push
```

---

## The daily loop (on whichever laptop you're using)

```bash
git pull          # 1. before you start — grab the latest
# ...make your edits...
git add -A
git commit -m "what I changed"
git push          # 2. when done — this SAVES to GitHub *and* publishes the live site
```

When you switch laptops, the first thing you do is **`git pull`** — it catches
that machine up to whatever you pushed from the other one. Coming home is just
`git pull` on the new laptop. Nothing physical to carry.

**The one rule that prevents all trouble:** pull before you start, push when you
stop. Don't leave unpushed edits sitting on one laptop while you work on the
other. Keep one machine "active" at a time.

`git push` is also your backup — anything pushed is safe on GitHub even if a
laptop is lost or dropped.

---

## Per-machine setup (each laptop needs this ONCE)

These do **not** sync — they're set up separately on each computer:

1. **Push auth (SSH).** Each laptop has its own SSH key registered to the GitHub
   account `daltoncorr-sudo`. Test it with:
   ```bash
   ssh -T git@github.com      # success = "Hi daltoncorr-sudo! ..."
   ```
   The remote should be SSH:
   ```
   git@github.com:daltoncorr-sudo/daltoncorr-porfolio.git
   ```
   (Yes — the repo name is spelled `porfolio`, missing a 't'. That's correct.)
   If a push ever fails with "Permission denied (publickey)", the key on that
   machine isn't registered — generate one (`ssh-keygen -t ed25519`) and add the
   `~/.ssh/id_ed25519.pub` line at https://github.com/settings/ssh/new.

2. **libwebp (image tools), only if converting images on that machine.** Provides
   `cwebp`/`dwebp`. There is **no Homebrew** on these machines, so it's installed
   manually into `~/.local/bin/` from Google's prebuilt mac-arm64 tarball. For the
   tools to be found, `~/.local/bin` must be on PATH:
   ```bash
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
   ```

---

## Normal site-editing workflow (the short version)

See `README.md` for full detail. The essentials:

1. Edit files in `site/` directly (HTML/CSS/JS).
2. If you changed `data/projects.json` → `python3 scripts/build_work_index.py`.
3. If you changed a shared template → `python3 scripts/sync_includes.py`.
4. **After any CSS/JS change** → `python3 scripts/bump_cache.py` (so browsers
   load the new version).
5. Preview: `cd site && python3 -m http.server 8080` → http://127.0.0.1:8080/
6. `git add -A && git commit && git push` (push publishes the live site).

---

## What's in this folder (plain language)

- `site/` — the actual website: ~80 pages + ~686 web-optimized images. **These
  images are small web copies, NOT your full-resolution originals.** Your real
  creative archive (the master files) is a separate, much larger thing that does
  not live here.
- `data/` — the list that feeds the Work page.
- `scripts/` — small Python helper tools (the "backend").
- `docs/` — notes (this file, plus NEXT_STEPS.md).
- `README.md` — full setup + conventions.
