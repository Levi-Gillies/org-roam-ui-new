# org-roam-ui (custom fork)

A graphical frontend for your [org-roam](https://github.com/org-roam/org-roam) Zettelkasten, forked from [org-roam/org-roam-ui](https://github.com/org-roam/org-roam-ui).

This fork features a cleaner UI with a transparent background (for camera/OBS overlays), a centered floating note viewer, and a built-in search bar.

## Installation

This fork is **not on MELPA**. Install it directly from GitHub.

### Doom Emacs

In `packages.el`:

```emacs-lisp
(unpin! org-roam)
(package! org-roam-ui
  :recipe (:host github :repo "levi-gillies/org-roam-ui" :branch "main" :files ("*.el" "out")))
```

In `config.el`:

```emacs-lisp
(use-package! websocket
  :after org-roam)

(use-package! org-roam-ui
  :after org-roam
  :config
  (setq org-roam-ui-sync-theme t
        org-roam-ui-follow t
        org-roam-ui-update-on-save t
        org-roam-ui-open-on-start t))
```

### straight/use-package

```emacs-lisp
(use-package org-roam-ui
  :straight
    (:host github :repo "levi-gillies/org-roam-ui" :branch "main" :files ("*.el" "out"))
  :after org-roam
  :config
  (setq org-roam-ui-sync-theme t
        org-roam-ui-follow t
        org-roam-ui-update-on-save t
        org-roam-ui-open-on-start t))
```

### Manual (package.el)

```bash
git clone https://github.com/levi-gillies/org-roam-ui ~/.emacs.d/org-roam-ui
```

In your init file:

```emacs-lisp
(add-to-list 'load-path "~/.emacs.d/org-roam-ui")
(require 'org-roam-ui)
```

## Usage

Run `M-x org-roam-ui-mode RET` to start the web server on `http://127.0.0.1:35901/`.

- **Search**: Use the search bar at the top center to find and zoom to nodes
- **Note preview**: Click a node or select a search result to open the floating note viewer
- **Navigation**: Use back/forward arrows and the collapse toggle in the note viewer toolbar

## Transparent Background / OBS Camera Overlay

The graph background is transparent by default. This lets you composite the graph over a webcam or other video source using OBS (or any tool that supports browser sources).

### OBS Setup

1. Start `org-roam-ui-mode` in Emacs
2. In OBS, add a **Browser Source** pointing to `http://127.0.0.1:35901/`
3. Set the browser source width/height to match your canvas
4. Check **"Shutdown source when not visible"** (optional)
5. Layer your webcam source **behind** the browser source — the graph floats over your camera

### Changing the background

The background color is set in `components/config.ts` in the `initialVisuals` object:

```ts
backgroundColor: 'transparent',  // default: transparent for overlays
// Change to any CSS color or Chakra UI color token, e.g.:
// backgroundColor: 'gray.900',
// backgroundColor: 'white',
```

## Customization

Visual defaults live in `components/config.ts` (the `initialVisuals` object). You can tweak node colors, link styles, label settings, and more. Settings are persisted in the browser's localStorage.

Additional styles can be modified in `styles/globals.css`.

## Development

```bash
git clone https://github.com/levi-gillies/org-roam-ui
cd org-roam-ui
yarn
yarn dev
```

A development server will start on `localhost:3000`.
