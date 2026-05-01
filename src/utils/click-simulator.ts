import { isContentEditable, isTextEntryInput } from './editable.js';

/**
 * Dispatches the seven-event mouse + click sequence Vimium uses in
 * `lib/dom_utils.js#simulateClick`, so menus and popovers built on
 * `pointerdown`/`pointerup` (Radix, bits-ui, shadcn-svelte) react as if
 * the user had really clicked. A bare `target.click()` only fires the
 * synthetic `click` event and is silently ignored by those libraries.
 *
 * Mirrors Vimium exactly: all dispatched as `MouseEvent`, all with
 * `detail: 1`, `pointerover` / `mouseover` lead the sequence so any
 * hover-gated activation sees us first.
 */
export const simulateClick = (target: HTMLElement): void => {
  const rect = target.getBoundingClientRect();
  const init: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    detail: 1,
    button: 0,
    buttons: 1,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  };

  const sequence = [
    'pointerover',
    'mouseover',
    'pointerdown',
    'mousedown',
    'pointerup',
    'mouseup',
    'click'
  ] as const;
  for (const eventType of sequence) {
    target.dispatchEvent(new MouseEvent(eventType, init));
  }
};

/**
 * Default `onActivate` implementation. Focuses text-entry targets so the
 * user can type immediately. Native `<input>` / `<select>` / `<object>` /
 * `<embed>` are focused first, then the click sequence is dispatched —
 * matches Vimium, which notes that recent Chrome ignores synthetic
 * mousedown on `<select>` so focusing at least lets Space / Enter open it.
 */
export const performTargetAction = (target: HTMLElement): void => {
  const tag = target.tagName.toLowerCase();

  if (tag === 'textarea' || isContentEditable(target)) {
    target.focus();
    return;
  }

  if (tag === 'input' && isTextEntryInput(target as HTMLInputElement)) {
    target.focus();
    return;
  }

  if (['input', 'select', 'object', 'embed'].includes(tag)) {
    target.focus();
  }

  simulateClick(target);
  target.focus({ preventScroll: true });
};
