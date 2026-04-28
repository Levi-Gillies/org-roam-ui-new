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
- `c` to create a new note from the browser and open it in the built-in editor
- `/` to search the graph or search inside the open node
- `e` to open the current node in Vim mode
- `f` to toggle node fullscreen mode
- `t` to toggle 2D/3D
- optional touch UI for phone use

## Current Position

Right now this fork is best understood as:

- a strong graph viewer
- a focused floating note reader
- a raw-text browser editor for existing org-roam notes

It is not yet a full primary note-taking platform in the same way Obsidian can be.

The biggest current gaps are:

- graph search is title-only, not full-text
- note creation is minimal and not template-driven
- there is no browser-side rename, move, duplicate, or create-in-folder flow
- backlinks are present, but outgoing links and unlinked mentions are missing
- note metadata is not editable through a structured UI
- there is no task, agenda, or canvas system

## Future Roadmap

This section documents the intended path for turning the project into a real browser-first org-roam note-taking surface.

The roadmap is ordered by impact. The early phases focus on replacing the most basic day-to-day workflows that Obsidian already covers well.

### Phase 1: Basic Daily-Driver Features

#### 1. Full-text search and quick switcher

Goal:

- find notes by title, body text, tags, and properties
- switch between notes quickly without depending on the graph

Why this comes first:

- title-only graph search is not enough for real note-taking
- this is one of the main reasons Obsidian feels usable as a primary tool

Implementation plan:

- extend `org-roam-ui.el` with a real search command instead of relying only on the frontend graph payload
- use `org-roam-db-query` for indexed metadata lookups where possible
- use a file-content search path for full-text note content search across the roam directory
- split the current search UX into:
  - graph node search
  - global quick switcher
  - full-text search results
- add keyboard-first result navigation and note preview

Likely files:

- `org-roam-ui.el`
- `pages/index.tsx`
- new search/result components

#### 2. Better note lifecycle management

Goal:

- create, rename, move, duplicate, and delete notes from the browser
- support creating notes inside folders and not just at the roam root

Why this comes first:

- if every basic file operation still needs Emacs, the browser cannot be the main place you work

Implementation plan:

- add websocket commands for `rename-node`, `move-node`, `duplicate-node`, and richer `create-node`
- keep Emacs as the authority for filesystem writes and `org-roam-db-sync`
- add browser modals for:
  - rename title and file slug separately
  - move to directory
  - duplicate into a new path
  - create note in selected folder
- replace top-level-only deletion with:
  - top-level file deletion
  - heading-node deletion
  - clearer destructive-action confirmations

Likely files:

- `org-roam-ui.el`
- `components/contextmenu.tsx`
- `pages/index.tsx`

#### 3. Daily notes and templates

Goal:

- create and open today’s daily note from the browser
- create notes from configurable templates

Why this comes first:

- this is a core note-taking workflow
- it removes one of the most common reasons to switch back to Emacs

Implementation plan:

- expose websocket commands for:
  - `open-today`
  - `create-daily`
  - `capture-with-template`
- use `org-roam-dailies` on the Emacs side instead of reimplementing daily-note logic in the browser
- use org-roam capture templates where possible instead of inventing a second template system
- add command-palette actions and touch UI buttons for daily note creation
- add a template picker to note creation

Likely files:

- `org-roam-ui.el`
- `pages/index.tsx`
- note creation UI components

#### 4. Outgoing links, unlinked mentions, and better backlinks

Goal:

- make note relationships explorable without depending only on the graph

Why this comes first:

- Obsidian’s note-local navigation is stronger because links are visible from multiple angles

Implementation plan:

- split note relationships into clear sections:
  - backlinks
  - outgoing links
  - citations/references
  - unlinked mentions
- include surrounding context/snippets for backlinks and unlinked mentions
- add sorting and filtering by link type
- compute unlinked mentions conservatively from note titles and aliases to avoid noisy false positives

Likely files:

- `components/Sidebar/Backlinks.tsx`
- new sidebar relationship components
- `org-roam-ui.el` for any extra relationship payload

#### 5. Structured metadata editor

Goal:

- edit title, tags, aliases, refs, and selected properties without raw text editing

Why this comes first:

- browser note-taking needs more than a plain text box
- this is the first step toward a real note form/editor experience

Implementation plan:

- send richer node metadata from Emacs, including known properties and aliases
- add a metadata panel above the note body
- support safe browser edits for:
  - title
  - tags
  - aliases
  - `ROAM_REFS`
  - arbitrary properties from the property drawer
- keep raw Vim editing available as the fallback and power-user mode

Likely files:

- `org-roam-ui.el`
- `components/Sidebar/index.tsx`
- new metadata editor components

### Phase 2: Task and Project Workflows

#### 6. Org task controls and agenda-like views

Goal:

- make TODO workflows usable from the browser

Implementation plan:

- add click/tap controls for toggling checkboxes and TODO keywords in rendered notes
- expose task extraction from Emacs so the browser can show:
  - tasks in the current note
  - tasks linked to the current note
  - global task lists
  - overdue and scheduled views
- allow filtering by TODO keyword, tag, and file path

This is the minimum feature set needed to compete with common Obsidian task workflows and the Tasks plugin.

#### 7. Saved searches, collections, and database-like note views

Goal:

- support list and table views of notes based on queries

Implementation plan:

- define a small query model for notes by tag, property, link count, directory, and date
- render results as lists and tables
- persist saved searches locally first, then optionally in org files later

This is the closest equivalent to the practical workflows people solve with Obsidian Dataview and Bases.

### Phase 3: Advanced Visual Features

#### 8. Canvas / whiteboard / visual map mode

Goal:

- support freeform spatial note arrangement beyond the force graph

Implementation plan:

- introduce a separate canvas document type instead of overloading the graph
- allow dragging notes, images, and text cards onto a board
- support saved canvas files and links back to org-roam nodes

This is the rough equivalent of Obsidian Canvas and visual plugins like Excalidraw, though likely with a narrower first version.

## Architecture Direction

The implementation direction for future work is:

- Emacs remains the authority for file writes, org-roam DB access, capture, and org semantics
- the browser becomes the main interaction layer for reading, searching, navigating, and editing
- websocket commands grow from the current minimal set into a richer action protocol
- graph updates should eventually become incremental instead of full reloads on every save

Most future work will fall into one of these buckets:

1. Extend `org-roam-ui.el` to expose new commands and richer data.
2. Extend `pages/index.tsx` state management for search, navigation, and editor behavior.
3. Break the sidebar into richer note panels instead of a single floating reader.
4. Add dedicated UI for metadata, tasks, search results, and file navigation.

## Recommended Build Order

If work starts now, the recommended order is:

1. Full-text search and quick switcher
2. Rename/move/create-in-folder/delete improvements
3. Daily notes and template-based creation
4. Outgoing links and unlinked mentions
5. Structured metadata editor
6. Task toggles and global task views
7. Canvas mode

## Scope Notes

To keep the project coherent:

- do not reimplement large parts of org semantics in TypeScript if Emacs already knows the answer
- keep raw-text Vim editing, but layer higher-level note controls on top of it
- prioritize features that remove context switching back to Emacs
- build the browser into a strong note-taking surface before chasing novelty features
- treat Obsidian as a benchmark for workflow coverage, not as a requirement to copy every UI decision

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
- press `c` to create a new note
- press `/` to open graph search
- press `t` to toggle 2D/3D
- press `z z` to center on the current node

Creating a note from the browser opens a compact title prompt, creates a new top-level `.org` note in your roam directory, refreshes the graph, and drops you into the built-in Vim editor for that note.

### Open Node

- `Tab` toggles collapse/expand
- click a heading to collapse or expand just that heading
- `/` searches inside the open node
- `n` and `N` move between in-node search matches
- `j` / `k` scroll
- `g g` jumps to top
- `G` jumps to bottom
- `Ctrl+d` / `Ctrl+u` half-page scroll
- `f` toggles fullscreen for the open node
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

- tap the `UI` button in the bottom-right to show or hide touch controls
- when enabled, the search bar appears
- when enabled, the `New` and `2D`/`3D` buttons sit on their own row below the search bar on small screens

When a node is open:

- the graph search bar and graph controls disappear
- only minimal node controls remain
- `X` closes the node
- the collapse icon toggles folded headings

## Keybindings

| Key | Action |
| --- | --- |
| `/` | Search graph, or search inside the current node |
| `c` | Create a new note |
| `Escape` | Close search/help/sidebar |
| `t` | Toggle 2D/3D |
| `e` | Open current node in Vim mode |
| `f` | Toggle fullscreen for the open node |
| `Tab` | Collapse/expand headings |
| Click heading | Collapse/expand one heading |
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
