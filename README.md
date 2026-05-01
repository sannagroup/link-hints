# link-hints

> Vimium-style keyboard link-hint navigation, embedded into any web page. Press `f`, see labels appear over every clickable element, type a label to click it.

<p align="center"><img src="https://raw.githubusercontent.com/sannagroup/link-hints/main/assets/hero.svg" alt="link-hints demo: orange link-hint badges over UI elements with the F key pressed"></p>

> **Status:** experimental. APIs may change before 1.0. No SLA on issues.

## Why

Power users build muscle memory. Adding Vimium-style link hints into your app means accountants, admins, ops folk, and anyone else who lives in the keyboard can move several times faster — without you writing a single keyboard shortcut handler. Every visible button, link, and input gets one automatically.

Compared to running the [Vimium Chrome extension](https://github.com/philc/vimium):

- **Stable hints per route.** The same button keeps the same label across activations and within-session navigations, so muscle memory actually forms.
- **`data-hint` attribute pinning.** Pin specific elements to specific shortcuts (`<a data-hint="OP">` → org-picker is always `OP`).
- **Themed to your app.** Default styles + CSS variables, no clash with your design system.
- **Works without the extension installed.** Ships in your bundle.

## Install

```bash
bun add @sannagroup/link-hints
# or: npm i @sannagroup/link-hints
# or: pnpm add @sannagroup/link-hints
# or: yarn add @sannagroup/link-hints
```

Zero dependencies. No framework lock-in.

## Quick start (vanilla)

```ts
import { createLinkHints } from '@sannagroup/link-hints';
import '@sannagroup/link-hints/style.css';

const hints = createLinkHints();

// Press `f` anywhere on the page. Type a hint label to click. Esc cancels.
// Call hints.dispose() when you're done (SPA route teardown, etc.).
```

That's it. The page is now hintable.

## Framework integration

`link-hints` is framework-free on purpose — wiring it into any UI library is two lines: call `createLinkHints()` on mount, call `dispose()` on unmount. Pick the snippet for your framework.

### Svelte 5

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { createLinkHints } from '@sannagroup/link-hints';
  import '@sannagroup/link-hints/style.css';

  let { children } = $props();

  onMount(() => {
    const hints = createLinkHints();
    return () => hints.dispose();
  });
</script>

{@render children()}
```

### React

```tsx
import { useEffect } from 'react';
import { createLinkHints, type LinkHintsOptions } from '@sannagroup/link-hints';
import '@sannagroup/link-hints/style.css';

export const useLinkHints = (options?: LinkHintsOptions): void => {
  useEffect(() => {
    const hints = createLinkHints(options);
    return () => hints.dispose();
  }, []);
};

// In your root layout:
const App = () => {
  useLinkHints();
  return <YourApp />;
};
```

### Vue 3

```ts
// composables/useLinkHints.ts
import { onMounted, onBeforeUnmount } from 'vue';
import { createLinkHints, type LinkHintsOptions } from '@sannagroup/link-hints';
import '@sannagroup/link-hints/style.css';

export const useLinkHints = (options?: LinkHintsOptions) => {
  let handle: ReturnType<typeof createLinkHints> | undefined;
  onMounted(() => {
    handle = createLinkHints(options);
  });
  onBeforeUnmount(() => {
    handle?.dispose();
  });
};
```

### SolidJS

```tsx
import { onMount, onCleanup } from 'solid-js';
import { createLinkHints, type LinkHintsOptions } from '@sannagroup/link-hints';
import '@sannagroup/link-hints/style.css';

export const LinkHints = (props: LinkHintsOptions) => {
  onMount(() => {
    const hints = createLinkHints(props);
    onCleanup(() => hints.dispose());
  });
  return null;
};
```

### Web Components

```ts
import { createLinkHints } from '@sannagroup/link-hints';
import styles from '@sannagroup/link-hints/style.css?raw';

class LinkHintsElement extends HTMLElement {
  private handle: ReturnType<typeof createLinkHints> | undefined;

  connectedCallback() {
    document.head.insertAdjacentHTML('beforeend', `<style>${styles}</style>`);
    this.handle = createLinkHints();
  }

  disconnectedCallback() {
    this.handle?.dispose();
  }
}

customElements.define('link-hints', LinkHintsElement);
// <link-hints></link-hints>
```

## Usage recipes

### 1. Pin specific elements with `data-hint`

The most common case. Add a 1–3-letter `data-hint` attribute to anything you want a stable mnemonic for:

```html
<a href="/organizations" data-hint="OR">Organizations</a>
<a href="/members" data-hint="ME">Members</a>
<button data-hint="OP">Open picker</button>
```

The label space adapts so no auto-assigned label collides with a pinned one.

### 2. Custom activation key

```ts
createLinkHints({ activationKey: 'g' });
```

### 3. Scope hints to a specific subtree

```ts
const panel = document.querySelector<HTMLElement>('#side-panel')!;
createLinkHints({ root: panel });
```

### 4. Custom click handler (analytics, modifiers, etc.)

```ts
import { createLinkHints, performTargetAction } from '@sannagroup/link-hints';

createLinkHints({
  onActivate: (target) => {
    analytics.track('hint_used', { id: target.id });
    performTargetAction(target); // delegate to the default click sequence
  }
});
```

### 5. Programmatic pinning (no DOM attribute)

```ts
const PIN_BY_HREF: Record<string, string> = {
  '/organizations': 'OR',
  '/members': 'ME'
};

createLinkHints({
  pinnedHint: (element) => {
    if (element instanceof HTMLAnchorElement) {
      return PIN_BY_HREF[new URL(element.href).pathname];
    }
    return undefined;
  }
});
```

### 6. Force-include or exclude specific elements

```ts
createLinkHints({
  isClickable: (element) => {
    if (element.classList.contains('skip-hint')) return false;
    if (element.classList.contains('force-hint')) return true;
    return undefined; // defer to default
  }
});
```

### 7. React to state changes

```ts
const hints = createLinkHints();

const unsubscribe = hints.subscribe((state) => {
  if (state.status === 'active') {
    statusPill.textContent = `${state.hints.size} hints`;
  } else {
    statusPill.textContent = '';
  }
});
```

### 8. Force-activate from a button

```ts
const hints = createLinkHints();
document.querySelector('#help-button')?.addEventListener('click', () => {
  hints.activate();
});
```

## Theming

```css
.link-hints-badge {
  --link-hints-bg: tomato;
  --link-hints-fg: white;
  --link-hints-ring: transparent;
  --link-hints-radius: 6px;
  --link-hints-font: 'Fira Code', monospace;
  --link-hints-size: 12px;
  --link-hints-z: 100000;
}

.link-hints-badge__typed {
  opacity: 0.4;
}
.link-hints-badge__remaining {
  font-weight: 800;
}
```

## API

### `createLinkHints(options?): LinkHintsHandle`

| Option          | Type                           | Default                     | Description                           |
| --------------- | ------------------------------ | --------------------------- | ------------------------------------- |
| `activationKey` | `string`                       | `'f'`                       | Key that toggles hint mode on.        |
| `root`          | `HTMLElement`                  | `document.body`             | Subtree to scan for clickables.       |
| `hintChars`     | `string`                       | `'sadfjklewcmpgh'`          | Characters used in generated labels.  |
| `onActivate`    | `(el) => void`                 | full mouse + click sequence | Action when a label uniquely matches. |
| `isClickable`   | `(el) => boolean \| undefined` | —                           | Override the default heuristic.       |
| `pinnedHint`    | `(el) => string \| undefined`  | reads `data-hint`           | Programmatic pin source.              |

### `LinkHintsHandle`

| Method                | Description                                        |
| --------------------- | -------------------------------------------------- |
| `activate()`          | Force-activate without keyboard input.             |
| `cancel()`            | Cancel an active session.                          |
| `subscribe(listener)` | Observe state changes. Returns unsubscribe fn.     |
| `getState()`          | Current `{ status, hints, typedPrefix }` snapshot. |
| `dispose()`           | Tear down listeners + DOM. Idempotent.             |

## Default behavior reference

- `f` activates anywhere on the page (configurable via `activationKey`).
- `f` is **not** captured while focus is in `<input>` / `<textarea>` / `<select>` / `contenteditable`.
- `Esc` cancels. `Backspace` removes one character. Other unrecognized keys are swallowed but don't cancel.
- Scrolling or resizing while active dismisses hint mode.
- Native `<select>` / `<input>` / `<object>` / `<embed>` are focused before the click sequence.
- Per-route stability: hints are remembered in-memory by `window.location.pathname`.
- Auto-repeated keydowns are ignored.

## How is this different from running Vimium itself?

The clickable-element detection (`getLocalHintsForElement`) and click-simulation event sequence (`simulateClick`) are ported from Vimium directly.

What we changed:

- **Per-route stability** — Vimium reshuffles labels every activation. We pin the assignment in memory by route so muscle memory works.
- **`data-hint` attribute pinning** — not in Vimium.
- **Subset of features.** No filtered text hints, no `F` for new tab, no Tab-to-rotate, no marks, no scroll commands. Pure click-by-label only.
- **Embedded, not an extension** — works for everyone visiting your site.

## Troubleshooting

**Hints don't appear over a button I expect to be clickable.** Some patterns the heuristic skips: `<img>` without `cursor: zoom-in`, `aria-disabled="true"`, text-only `<span>` wrappers around real clickables, `tabindex`-only focusable elements that overlap a real clickable. Use `isClickable: el => true` to force-include.

**My menu opens then immediately closes.** bits-ui dropdowns treat `event.detail === 0` as a synthetic activation and re-toggle. Our `simulateClick` already sets `detail: 1`. If your library has its own collision, override `onActivate`.

**The badge appears in the wrong position.** Most often a `position: fixed` ancestor with a transform. File an issue with a repro.

**Hint mode triggers in code editors / Monaco / CodeMirror.** Use `isClickable` returning `false` for the editor's container.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup, style, testing, and the release process.

## Acknowledgements

Detection rules and the click-simulation event sequence are ported from [Vimium](https://github.com/philc/vimium) (MIT). See [`NOTICE`](NOTICE).

## License

[MIT](LICENSE).
