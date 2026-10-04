**Web offline-first creative and academic focused tools for the browser.**
No accounts, no cloud, no tracking. Your work stays on your device.

Four apps, one consistent design system, eight languages.

---

## What's inside

| App | What it is | For whom |
|-----|------------|----------|
| **Paint.web** | Raster paint studio with layers, filters, adjustments, and shape tools | Illustrators, photo editors, sketchers |
| **Inkling** | SVG vector editor with pen, shapes, gradients, layers, boolean ops | Logo designers, icon makers, illustrators |
| **Thesis** | Academic word processor with ABNT/APA/MLA standards, reference generator, real PDF/DOCX/ODT export | Students, researchers, writers |
| **Notebase** | Local-first Markdown knowledge base with live preview, search, tags, wiki-links and backlinks | Writers, students, second brains |

---

## Quick start

1. Download the folder.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. Pick an app from the portal.

That's it. No server, no install, no build step. The suite works from a USB stick, an SD card, or your local disk.

> **Offline use:** Once loaded, all four apps work without an internet connection. The first time you export to PDF / DOCX / ODT, the suite fetches small JavaScript libraries from a CDN; after that they're cached by the browser.

---

## The Unity-style HUD

Every app has a **global menu bar at the top** with the standard menus (File, Edit, View, etc.). Click a menu to drop down its items, or use the keyboard.

Press **`Alt`** (or `Ctrl+Space`) anywhere to open the **command palette**: a search box that lets you find and run any command by name. Type "export", "layer", "undo", "save": the palette filters instantly. Press `Enter` to run.

Press **`?`** (or click the `?` button on the menu bar) to see the full list of keyboard shortcuts for the current app.

---

## Languages

Eight languages are built in. Switch from the language selector on the menu bar: your choice persists across sessions and apps:

- English (`en`)
- Português brasileiro (`pt-BR`)
- Português europeu (`pt-PT`)
- Italiano (`it`)
- Français (`fr`)
- 日本語 (`ja`)
- Deutsch (`de`)
- Українська (`uk`)

---

## Themes

- **Auto**: follows your operating system preference
- **Light**: forced light
- **Dark**: forced dark

Themes sync across all five pages (portal + four apps) automatically.

---

## File structure

```
float-suite/
├── index.html              ← Portal / launcher
├── paint.html              ← Paint.web (raster)
├── inkling.html            ← Inkling (vector)
├── thesis.html             ← Thesis (academic word processor)
├── notes.html              ← Notebase (local-first Markdown knowledge base)
├── package.json            ← Electron + electron-builder config
├── .gitignore
├── README.md               ← This file
├── .github/
│   └── workflows/
│       └── build.yml       ← GitHub Actions: deb/rpm/pacman/AppImage/dmg/exe
├── electron/               ← Electron wrapper for native packaging
│   ├── main.js             ← Main process (window, menu, native dialogs)
│   ├── main-thesis.js      ← Thesis main process
│   ├── main-notes.js       ← Notebase main process
│   ├── preload.js          ← Minimal context bridge
│   └── build/
│       └── entitlements.mac.plist
├── shared/                 ← Shared runtime (loaded by all 5 pages)
│   ├── float.css           ← Design tokens, HUD, modals, toasts
│   ├── i18n.js             ← 8-language dictionary
│   ├── float.js            ← HUD engine, theme, shortcuts, modal manager
│   └── exporters.js        ← PDF / DOCX / ODT exporters (lazy-loaded)
├── favicons/               ← Neo-brutalist icon set (SVG + PNG + ICO)
│   ├── float.svg/png/ico   ← Portal
│   ├── paint.svg/png/ico   ← Paint.web (yellow + paint brush)
│   ├── inkling.svg/png/ico ← Inkling (pink + Blooper squid)
│   └── thesis.svg/png/ico  ← Thesis (blue + open book)
│   └── notes.svg/png/ico   ← Notebase (purple + open book)
└── README.md               ← This file
```

Each app HTML is self-contained: it only depends on `shared/` and `favicons/`. You can host the folder anywhere, or open files directly from disk.

---

## Keyboard shortcuts

Press `?` in any app to see its full shortcut list. The most common ones:

| Shortcut | Action |
|----------|--------|
| `Alt` | Open command palette (HUD search) |
| `Ctrl+Space` | Same: command palette |
| `?` | Show shortcuts help |
| `Ctrl+S` | Save / Export |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+A`, `Ctrl+C`, `Ctrl+X`, `Ctrl+V` | Standard edit ops |
| `Esc` | Close modal / palette / overlay |

### Paint.web tools
`H` move · `B` brush · `P` pencil · `E` eraser · `G` fill · `I` eyedropper · `T` text · `M` rect-select · `L` lasso · `W` magic wand · `C` crop · `U` rectangle · `O` ellipse · `[` `]` brush size · `X` swap colors · `D` reset colors

### Inkling tools
`V` select · `A` direct select · `P` pen · `B` freehand · `T` text · `I` eyedropper · `R` rectangle · `E` ellipse · `L` line · `Y` polygon · `S` star · `H` hand · `Z` zoom · `F` fit · `Ctrl+G` group · `Ctrl+Shift+G` ungroup

### Thesis
`Ctrl+B` bold · `Ctrl+I` italic · `Ctrl+U` underline · `Ctrl+F` find · `Ctrl+L` link · `Ctrl+K` reference · `Ctrl+Enter` page break · `F11` zen mode

### Notebase
`Ctrl+N` new note · `Ctrl+S` save · `Ctrl+Alt+D` daily note · `Ctrl+E` export · `Ctrl+F` search · `F11` focus mode (hide sidebar)

---

## Export formats

| App | Formats |
|-----|---------|
| Paint.web | PNG, JPEG, WebP, PDF, DOCX (image embedded), ODT |
| Inkling | SVG, PNG, PDF |
| Thesis | PDF, DOCX (true OOXML), ODT, HTML, TXT |
| Notebase | Markdown, TXT, HTML, PDF, DOCX, ODT |

### How PDF export works
The suite uses `jsPDF` (lazy-loaded from CDN). The canvas / paper is rasterized at 2× resolution, then sliced into A4 pages with proper margins.

---

## Data and privacy

| What | Where |
|------|-------|
| Theme preference | `localStorage["float_theme_mode"]` |
| Language preference | `localStorage["float_lang"]` |
| Paint.web autosave | `localStorage["paint_autosave"]` |
| Paint.web swatches | `localStorage["paint_swatches"]` |
| Inkling autosave | `localStorage["inkling_autosave"]` |
| Thesis documents | `localStorage["thesis_docs"]` (array of `{name, content, standard, modified, wordCount, footnoteCount, cover}`) |
| Thesis settings | `localStorage["thesis_settings"]` |
| Thesis daily word count | `localStorage["thesis_words_<YYYY-MM-DD>")` |
| Notebase notes | `localStorage["notebase_notes"]` (array of `{id, title, body, created, modified, pinned}`) |

**Nothing else.** No cookies, no analytics, no network requests during normal use (except the one-time CDN load for export libraries).

### Backup
To back up your work, copy the relevant `localStorage` keys via the browser console:

```js
JSON.stringify({
  docs: localStorage.getItem('thesis_docs'),
  settings: localStorage.getItem('thesis_settings'),
  paint: localStorage.getItem('paint_autosave'),
  inkling: localStorage.getItem('inkling_autosave'),
  notes: localStorage.getItem('notebase_notes'),
  theme: localStorage.getItem('float_theme_mode'),
  lang: localStorage.getItem('float_lang')
}, null, 2)
```

### Restore
Paste the JSON back into `localStorage` with the same keys.

---
### Building a new app on the same foundation

1. Include `shared/float.css`, `shared/i18n.js`, `shared/float.js`, `shared/exporters.js` in that order.
2. Add `<div id="hud-mount"></div>` where you want the menu bar to appear.
3. Call `Float.mountHUD(spec)` with your menu spec.
4. Register commands and shortcuts via `Float.registerCommand(...)` and `Float.addShortcut(...)`.

---

## Native desktop builds (Electron)

The suite ships as static HTML/CSS/JS: but it can be wrapped in Electron for native installation on Linux, macOS, and Windows. The repo includes:

- `electron/main.js`: Electron main process. Creates a 1440×900 window, loads the portal, sets a native menu, exposes `window.floatDesktop.isDesktop` to pages.
- `electron/preload.js`: minimal context-isolated bridge.
- `package.json`: full `electron-builder` config for all 6 targets.
- `.github/workflows/build.yml`: CI that builds everything on push to `main`, on PRs, and on `v*` tags. Tag pushes publish a GitHub Release.

### Targets

| Format | Platform | Runner | Notes |
|--------|----------|--------|-------|
| `.deb` | Debian / Ubuntu | ubuntu-22.04 | x64 + arm64 |
| `.rpm` | Fedora / RHEL / SUSE | ubuntu-22.04 | x64 + arm64 |
| `.pacman` | Arch Linux | ubuntu-22.04 | x64 |
| `.AppImage` | Universal Linux | ubuntu-22.04 | x64 + arm64 |
| `.dmg` | macOS | macos-13 | x64 + arm64 (Universal) |
| `.exe` | Windows | windows-2022 | NSIS installer + portable |

---

## Changelog

### Suite 5.1, current
- Eight-language interface (en, pt-BR, pt-PT, it, fr, ja, de, uk)
- Unity-style HUD with command palette (`Alt` to open)
- Real `.docx` export via the `docx` library (was fake `.doc` HTML before)
- Real `.odt` export via JSZip (ODF package assembly)
- Fixed Paint.web: magic wand, smudge, blur tools now work; invert selection implemented
- Fixed Inkling: boolean ops (via clip-path / mask), align to artboard, snap-to-objects
- Fixed Thesis: PDF export zoom bug fixed, page-break visual artifacts removed, autosave restored
- New app: **Notebase**: local-first Markdown knowledge base (live preview, search, tags, wiki-links, backlinks, daily notes, MD/TXT/HTML/PDF/DOCX/ODT export)
- Cross-app theme sync
- Shortcuts help overlay
- Autosave in Paint.web, Inkling, and Thesis; instant autosave in Notebase
- Removed dead code, AI-generated boilerplate comments, and unused variables across all five files

### Suite 5.0
- Initial release of the shared design system and i18n layer
- Four apps unified under a single portal

---

## Acknowledgements

Built for people who finish things, students writing a thesis at 2 a.m., illustrators sketching on a train, designers mocking up a logo between meetings. May your work be yours.
