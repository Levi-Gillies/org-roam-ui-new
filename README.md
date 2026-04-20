# org-roam-ui (custom fork)

This is a heavily customized fork of [org-roam/org-roam-ui](https://github.com/org-roam/org-roam-ui).

It is no longer the stock tweak-panel graph UI. This fork is built around:

- a minimal graph view
- a centered floating node reader
- keyboard-first navigation
- an in-browser Vim editor for node text
- a very small touch/mobile UI that can be toggled on when needed

The static site is served from `out/`, and the Emacs integration lives in `org-roam-ui.el`.

## What This Fork Does

- 2D and 3D graph modes
- black node labels rendered above the nodes for readability
- click a node to open it in a floating reader
- `/` to search the graph or search inside the open node
- `e` to open the current node in Vim mode
- `Alt+f` to toggle node fullscreen mode
- `t` to toggle 2D/3D
- optional touch UI for phone use

## Installation

This fork is not on MELPA. Install it directly from GitHub.

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
        org-roam-ui-open-on-start nil))
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
        org-roam-ui-open-on-start nil))
```

### Manual

```bash
git clone https://github.com/levi-gillies/org-roam-ui ~/.emacs.d/org-roam-ui
```

Then in your init:

```emacs-lisp
(add-to-list 'load-path "~/.emacs.d/org-roam-ui")
(require 'org-roam-ui)
```

## Running It

Start the Emacs side:

```text
M-x org-roam-ui-mode
```

That serves the exported frontend on:

```text
http://127.0.0.1:35901/
```

The frontend talks to Emacs over websocket on port `35903`.

## How To Use It

### Graph

- click a node to open it
- press `/` to open graph search
- press `t` to toggle 2D/3D
- press `z z` to center on the current node

### Open Node

- `Tab` toggles collapse/expand
- `/` searches inside the open node
- `n` and `N` move between in-node search matches
- `j` / `k` scroll
- `g g` jumps to top
- `G` jumps to bottom
- `Ctrl+d` / `Ctrl+u` half-page scroll
- `Alt+f` toggles fullscreen for the open node
- `Escape` closes search/help/sidebar

### Vim Mode

Open the current node in Vim mode with:

```text
e
```

Inside Vim mode:

- normal / insert / visual modes are supported through CodeMirror Vim
- line numbers are shown
- Org syntax is highlighted
- `:w` saves
- `:q` exits only if clean
- `:q!` discards unsaved changes
- `:wq` saves and exits
- `:x` saves and exits

Saving is done through the Emacs websocket path, not a standalone server API.

## Touch UI

The touch UI is off by default.

When no node is open:

- tap the eye icon in the bottom-right to show or hide touch controls
- when enabled, the search bar appears
- when enabled, the 2D/3D toggle appears in the top-left

When a node is open:

- the graph search bar and graph controls disappear
- only minimal node controls remain
- `X` closes the node
- the collapse icon toggles folded headings

## Keybindings

| Key | Action |
| --- | --- |
| `/` | Search graph, or search inside the current node |
| `Escape` | Close search/help/sidebar |
| `t` | Toggle 2D/3D |
| `e` | Open current node in Vim mode |
| `Alt+f` | Toggle fullscreen for the open node |
| `Tab` | Collapse/expand headings |
| `j` / `k` | Scroll node down / up |
| `h` / `l` | Previous / next preview node |
| `n` / `N` | Next / previous in-node search match |
| `g g` | Jump to top |
| `G` | Jump to bottom |
| `Ctrl+d` / `Ctrl+u` | Half-page down / up |
| `z z` | Center current node in graph |
| `?` | Toggle help overlay |

## Visual Defaults

Current defaults include:

- background: `#c6c6c6`
- black graph labels
- labels rendered above nodes
- floating reader for opened notes
- smaller backlinks box

Main visual defaults live in:

- `components/config.ts`
- `styles/globals.css`

## Development

Install dependencies:

```bash
yarn
```

Run local dev server:

```bash
yarn dev
```

The scripts already include the OpenSSL compatibility flag needed for newer Node versions.

## Building The Static Site

This fork uses a custom Next build dir:

```text
build/
```

and exports the static site to:

```text
out/
```

To regenerate the deployable static frontend:

```bash
yarn export
```

That script now runs the required build step first and then exports.

If you deploy this through Emacs or behind nginx on another machine, you need both:

- updated `out/`
- updated `org-roam-ui.el`

If you only update `out/` but not `org-roam-ui.el`, frontend and backend behavior can drift.
