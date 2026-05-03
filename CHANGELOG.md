# @sannagroup/link-hints

## 0.5.0

### Minor Changes

- b74f05e: `hintChars` now accepts `{ include: string }` or `{ exclude: string }` in
  addition to a plain string. `{ include: 'xy' }` adds to the default set;
  `{ exclude: 's' }` drops characters from it (useful when your app already
  binds `s` to its own shortcut). Passing a plain string still replaces the
  default set outright.

## 0.4.0

### Minor Changes

- 69921ee: Hint detection now descends into open shadow roots, mirroring Vimium's `getAllElements`. Components built on web components (Lit, Stencil, Shoelace, custom `<sl-button>`-style wrappers) now receive hints. Closed shadow roots remain inaccessible by spec.

### Patch Changes

- 69921ee: Pressing Backspace on an empty typed prefix now exits hint mode, matching Vimium hint mode's behaviour. Previously it was a silent no-op.
- 1d72ccc: Dismiss the active hint overlay on outside click and window blur, mirroring Vimium hint mode's `exitOnClick` and `exitOnBlur`.

## 0.3.0

### Minor Changes

- f7625bd: Allow multiple elements to share the same `data-hint` value. Previously, two elements with `data-hint="S"` threw `duplicate pinned hint "S"`. They are now auto-numbered in document order — `S1`, `S2`, `S3`, … — so list rows that share a mnemonic can be picked by typing the prefix followed by a digit. A `data-hint` value used by exactly one element is unchanged (no suffix). Auto-assigned labels remain alphabetic-only; digits only ever appear as a suffix on a user-supplied `data-hint`. The keydown handler now also accepts `0-9` so the digit suffix can be typed.

## 0.2.3

### Patch Changes

- fa2ec35: Internal: extract `isEditableElement` / `isTextEntryInput` / `isContentEditable` into `src/utils/editable.ts` and share between `link-hints.ts` and `click-simulator.ts`, removing the duplicated `TEXT_INPUT_TYPES_TO_IGNORE` constant. The `isContentEditable` helper now also accepts an explicit `contentEditable="true"` attribute, fixing a latent case where `HTMLElement.isContentEditable` was not reflected by the live getter. Adds util test coverage to 100% statements/lines (click-simulator and emitter were previously untested). No public API change.

## 0.2.2

### Patch Changes

- 4bf3a48: Fix Node ESM resolution by adding explicit `.js` extensions to relative imports in source. Previously the published `dist/index.js` emitted `import ... from './badge-renderer'` which Node ESM (used by Vite SSR, Next.js server, etc.) cannot resolve, producing `Cannot find module '.../dist/badge-renderer'` at import time.

## 0.2.1

### Patch Changes

- b83449a: Internal: reorganize `src/` — move stateless helpers under `utils/`, move CSS under `style/`, rename `controller.ts` to `link-hints.ts` and the internal class `LinkHintsController` to `LinkHints`. Flatten the repo layout: drop the bun-workspaces monorepo and publish `@sannagroup/link-hints` directly from the root. No public API change.

## 0.2.0

### Minor Changes

- 10ddee0: Initial release. Vimium-style keyboard link-hint navigation, framework-free. Press `f` to label every visible interactive element, type the label to click it. README has integration recipes for Svelte, React, Vue, Solid, and Web Components.
