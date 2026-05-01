# hint-mode

> Vimium-style keyboard hint navigation, embedded into any web page. Press `f`, see labels appear over every clickable element, type a label to click it.

```text
┌──────────────────────────────────────────┐
│  ┌──┐                                    │
│  │AS│ Save  ┌──┐ Cancel  ┌──┐ Open       │
│  └──┘       │HD│         │OV│            │
│             └──┘         └──┘            │
│  ┌──┐                                    │
│  │FI│ ☐ Search…                          │
│  └──┘                                    │
└──────────────────────────────────────────┘
        Press F to activate · Esc to cancel
```

> **Status:** experimental. APIs may change before 1.0. No SLA on issues.

## Why

Power users build muscle memory. Adding Vimium-style hints into your app means accountants, admins, ops folk, and anyone else who lives in the keyboard can move several times faster — without you writing a single keyboard shortcut handler. Every visible button, link, and input gets one automatically.

Compared to running the [Vimium Chrome extension](https://github.com/philc/vimium):

- **Stable hints per route.** The same button keeps the same label across activations and within-session navigations, so muscle memory actually forms.
- **`data-hint` attribute pinning.** Pin specific elements to specific shortcuts (`<a data-hint="OP">` → org-picker is always `OP`).
- **Themed to your app.** Default styles + CSS variables, no clash with your design system.
- **Works without the extension installed.** Ships in your bundle.

## Install

```bash
bun add @sannagroup/hint-mode
# or: npm i @sannagroup/hint-mode
# or: yarn add @sannagroup/hint-mode
# or: pnpm add @sannagroup/hint-mode
```

A single package ships both the framework-free core and an opt-in Svelte adapter via subpath import. `svelte` is an **optional** peer dependency — vanilla consumers don't pay for it.

## Quick start

### Vanilla / any framework

```ts
import { createHintMode } from '@sannagroup/hint-mode';
import '@sannagroup/hint-mode/style.css';

const hints = createHintMode();

// Press `f` anywhere in the page. `Esc` cancels. Type a hint label to click.
// Call `hints.dispose()` when you're done (e.g. on SPA route teardown,
// React component unmount, etc.).
```

### Svelte 5

```svelte
<script lang="ts">
  import { HintMode } from '@sannagroup/hint-mode/svelte';
  import '@sannagroup/hint-mode/style.css';
</script>

<HintMode />
```

Mount it once, near the top of your app's layout. The component handles `onMount` / destroy lifecycle for you.

### React (using the vanilla core)

There's no first-party React adapter yet, but the core is small enough to wrap in a hook:

```tsx
import { useEffect } from 'react';
import { createHintMode, type HintModeOptions } from '@sannagroup/hint-mode';
import '@sannagroup/hint-mode/style.css';

export const useHintMode = (options?: HintModeOptions): void => {
  useEffect(() => {
    const hints = createHintMode(options);
    return () => hints.dispose();
  }, []);
};

// In your root layout:
const App = () => {
  useHintMode();
  return <YourApp />;
};
```

## Usage recipes

### 1. Pin specific elements with `data-hint`

The most common case. Add a 1–3-letter `data-hint` attribute to anything you want a stable mnemonic for:

```html
<a href="/organizations" data-hint="OR">Organizations</a>
<a href="/members" data-hint="ME">Members</a>
<button data-hint="OP">Open picker</button>
```

The label space adapts so no auto-assigned label collides with a pinned one. After this:

- `f` then `OR` → always navigates to organizations
- `f` then `OP` → always opens the picker
- `f` then any other auto-assigned label still works for everything else

Best places to pin: navigation rails, top-level CTAs, anything users hit dozens of times a day.

### 2. Custom activation key

Use any single key. `'f'` is Vimium's default, but you can pick whatever doesn't collide with your app:

```ts
createHintMode({ activationKey: 'g' });
```

### 3. Scope hints to a specific subtree

By default we scan `document.body`. You can scope to any element — useful if you want hints only inside a side panel or a specific dialog:

```ts
const panel = document.querySelector<HTMLElement>('#side-panel')!;
createHintMode({ root: panel });
```

### 4. Custom click handler (analytics, modifiers, etc.)

`onActivate` runs when the user types a label that uniquely matches an element. The default fires the [seven-event mouse + click sequence Vimium uses](https://github.com/philc/vimium/blob/master/lib/dom_utils.js) — works with bits-ui, Radix, shadcn-svelte etc. Override it if you need to add analytics, support modifier-aware open-in-new-tab, or use a different click strategy:

```ts
import { createHintMode, performTargetAction } from '@sannagroup/hint-mode';

createHintMode({
  onActivate: (target) => {
    analytics.track('hint_used', { id: target.id });
    performTargetAction(target); // delegate to the default
  }
});
```

### 5. Programmatic pinning (no DOM attribute)

If your build tooling makes adding `data-hint` attributes inconvenient, supply a function instead:

```ts
const PIN_BY_HREF: Record<string, string> = {
  '/organizations': 'OR',
  '/members': 'ME'
};

createHintMode({
  pinnedHint: (element) => {
    if (element instanceof HTMLAnchorElement) {
      return PIN_BY_HREF[new URL(element.href).pathname];
    }
    return undefined;
  }
});
```

### 6. Force-include or exclude specific elements

`isClickable` lets you override the default Vimium-derived heuristic. Return `true` to force-hint, `false` to force-skip, `undefined` to defer to the default:

```ts
createHintMode({
  isClickable: (element) => {
    if (element.classList.contains('skip-hint')) return false;
    if (element.classList.contains('force-hint')) return true;
    return undefined;
  }
});
```

### 7. React to state changes (custom UI on top of hint mode)

Subscribe to controller state to drive your own indicator (e.g. a status pill in the header showing "Hint mode: 12 hints"):

```ts
const hints = createHintMode();

const unsubscribe = hints.subscribe((state) => {
  if (state.status === 'active') {
    statusPill.textContent = `${state.hints.size} hints`;
  } else {
    statusPill.textContent = '';
  }
});

// Later
unsubscribe();
hints.dispose();
```

### 8. Force-activate from a button (no keyboard)

```ts
const hints = createHintMode();
document.querySelector('#help-button')?.addEventListener('click', () => {
  hints.activate();
});
```

## Theming

The default style is a small orange pill. Override any CSS variable on the badge:

```css
.hint-mode-badge {
  --hint-mode-bg: tomato; /* background color */
  --hint-mode-fg: white; /* foreground / text color */
  --hint-mode-ring: transparent; /* outline ring */
  --hint-mode-radius: 6px; /* border radius */
  --hint-mode-font: 'Fira Code', monospace;
  --hint-mode-size: 12px; /* font-size */
  --hint-mode-z: 100000; /* portal z-index (set on .hint-mode-portal) */
}
```

The typed-prefix portion of each label uses `.hint-mode-badge__typed`; the remaining portion uses `.hint-mode-badge__remaining`. Style them independently if you want a Vimium-style two-tone label:

```css
.hint-mode-badge__typed {
  opacity: 0.4;
}
.hint-mode-badge__remaining {
  font-weight: 800;
}
```

## API

### `createHintMode(options?): HintModeHandle`

| Option          | Type                           | Default                     | Description                                           |
| --------------- | ------------------------------ | --------------------------- | ----------------------------------------------------- |
| `activationKey` | `string`                       | `'f'`                       | Key that toggles hint mode on.                        |
| `root`          | `HTMLElement`                  | `document.body`             | Subtree to scan for clickables.                       |
| `hintChars`     | `string`                       | `'sadfjklewcmpgh'`          | Characters used in generated labels. Alphabetic only. |
| `onActivate`    | `(el) => void`                 | full mouse + click sequence | Action when a label uniquely matches.                 |
| `isClickable`   | `(el) => boolean \| undefined` | —                           | Override the default heuristic.                       |
| `pinnedHint`    | `(el) => string \| undefined`  | reads `data-hint`           | Programmatic pin source.                              |

### `HintModeHandle`

| Method                | Description                                                     |
| --------------------- | --------------------------------------------------------------- |
| `activate()`          | Force-activate without keyboard input. No-op if already active. |
| `cancel()`            | Cancel an active session. No-op if already idle.                |
| `subscribe(listener)` | Observe state changes. Returns unsubscribe fn.                  |
| `getState()`          | Current `{ status, hints, typedPrefix }` snapshot.              |
| `dispose()`           | Tear down listeners + DOM. Idempotent.                          |

### `HintModeState`

```ts
type HintModeState = {
  status: 'idle' | 'active';
  hints: ReadonlyMap<HTMLElement, string>;
  typedPrefix: string;
};
```

## Default behavior reference

- `f` activates hint mode anywhere on the page (configurable via `activationKey`).
- `f` is **not** captured while focus is in `<input>`, `<textarea>`, `<select>`, or `contenteditable` — you can still type the letter `f` in form fields.
- `Esc` cancels. `Backspace` removes one character from the typed prefix. Any letter advances. Any other key (function keys, modifiers alone) is swallowed but does **not** cancel.
- Scrolling or window resize while active dismisses hint mode (positions would otherwise drift).
- Native `<select>`, `<input>`, `<object>`, `<embed>` get focused before the click sequence — recent Chrome ignores synthetic mousedown on `<select>`, but focusing at least lets you press Space/Enter to open the picker.
- Per-route stability: hints are remembered in-memory by `window.location.pathname` so the same button keeps its label across activations and within-session SPA navigations. Refreshing the page or calling `dispose()` clears the memory.
- Auto-repeated keydowns (held key) are ignored.

## How is this different from running Vimium itself?

The clickable-element detection (`getLocalHintsForElement`) and click-simulation event sequence (`simulateClick`) are ported from Vimium directly. You should expect the same set of elements to be hintable here that Vimium would hint.

What we changed:

- **Per-route stability** — Vimium reshuffles labels every activation. We pin the assignment in memory by route so muscle memory works.
- **`data-hint` attribute pinning** — not in Vimium.
- **Subset of features.** No filtered text hints, no `F` for new tab, no Tab-to-rotate, no marks, no scroll commands. Pure click-by-label only.
- **Embedded, not extension** — works for everyone visiting your site.

## Troubleshooting

**Hints don't appear over a button I expect to be clickable.** The default heuristic is intentionally Vimium-faithful. Some patterns it skips: `<img>` without `cursor: zoom-in`, elements with `aria-disabled="true"`, text-only `<span>` wrappers around real clickables, and `tabindex`-only focusable elements that overlap a real clickable. Use `isClickable: el => true` to force-include a specific node.

**My menu opens then immediately closes.** This used to happen with bits-ui dropdowns: their click handler treats `event.detail === 0` as a synthetic activation and re-toggles. Our `simulateClick` already sets `detail: 1`. If you're using a different lib that has its own collision, override `onActivate` to suit.

**The badge appears in the wrong position.** Most often a `position: fixed` ancestor with a transform. The badge uses `position: absolute` inside a `position: fixed` portal — usually correct. File an issue with a repro if you hit a case where it's not.

**Hint mode triggers in code editors / Monaco / CodeMirror.** Editor focus traps don't always set `INPUT`/`TEXTAREA`/`contentEditable` cleanly. Override the activation behavior with your own check via `isClickable` returning `false` for the editor's container.

## Acknowledgements

Detection rules and the click-simulation event sequence are ported from [Vimium](https://github.com/philc/vimium) (MIT). See [`NOTICE`](NOTICE).

## License

[MIT](LICENSE).
