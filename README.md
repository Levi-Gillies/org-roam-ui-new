# org-roam-ui (custom fork)

A graphical frontend for your [org-roam](https://github.com/org-roam/org-roam) Zettelkasten, forked from [org-roam/org-roam-ui](https://github.com/org-roam/org-roam-ui).

This fork features a retro Apple II aesthetic with vim-style keybindings, a centered floating note viewer, and a built-in search bar.

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

- **Search**: Press `/` to open the search bar, find and zoom to nodes
- **Note preview**: Click a node or select a search result to open the floating note viewer
- **Navigation**: Use back/forward arrows and the collapse toggle in the note viewer toolbar
- **2D/3D toggle**: Click the button in the top-left corner or press `t`

## Keybindings

This fork uses vim-style keybindings for navigation:

| Key | Action |
|-----|--------|
| `/` | Open search bar |
| `Escape` | Close search / sidebar / help |
| `t` | Toggle 2D/3D |
| `j` / `k` | Scroll sidebar down / up |
| `h` / `l` | Previous / next preview node |
| `g g` | Scroll to top of sidebar |
| `G` | Scroll to bottom of sidebar |
| `Ctrl+d` / `Ctrl+u` | Half-page scroll down / up |
| `z z` | Center/zoom to current node |
| `:` | Open command mode |
| `:q` + Enter | Close sidebar |
| `:help` + Enter | Show keybinding help |
| `?` | Toggle keybinding help overlay |

## Retro Apple II Theme

The graph uses a retro Apple II inspired color scheme:
- **Background**: Warm beige (#F5E6C8)
- **Nodes**: Apple rainbow colors (green, yellow, orange, red, purple, blue)
- **Links**: Muted retro green
- **Labels**: Off-white on terminal font (VT323)
- **Font**: VT323 monospace throughout

## Customization

Visual defaults live in `components/config.ts` (the `initialVisuals` object). You can tweak node colors, link styles, label settings, and more. Settings are persisted in the browser's localStorage.

Additional styles can be modified in `styles/globals.css`.

### Changing the background

The background color is set in `components/config.ts` in the `initialVisuals` object:

```ts
backgroundColor: '#F5E6C8',  // default: retro beige
// Change to any CSS color or Chakra UI color token, e.g.:
// backgroundColor: 'gray.900',
// backgroundColor: 'transparent',  // for OBS overlays
```

## Development

```bash
git clone https://github.com/levi-gillies/org-roam-ui
cd org-roam-ui
yarn
yarn dev
```

A development server will start on `localhost:3000`.
