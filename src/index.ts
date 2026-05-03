import { BadgeRenderer } from './badge-renderer.js';
import { LinkHints, defaultOnActivate } from './link-hints.js';
import type { LinkHintsHandle, LinkHintsOptions, LinkHintsState } from './types.js';

const defaultPinnedHint = (element: HTMLElement): string | undefined =>
  element.dataset.hint ?? undefined;

const defaultIsClickable = (): boolean | undefined => undefined;

const resolveOptions = (options: LinkHintsOptions = {}): Required<LinkHintsOptions> => ({
  root: options.root ?? document.body,
  activationKey: options.activationKey ?? 'f',
  hintChars: options.hintChars ?? 'sadfjklewcmpgh',
  onActivate: options.onActivate ?? defaultOnActivate,
  isClickable: options.isClickable ?? defaultIsClickable,
  pinnedHint: options.pinnedHint ?? defaultPinnedHint
});

/**
 * Create a hint-mode session. Installs a global keydown listener that
 * activates on the configured key and renders badges into a portal under
 * `document.body`. Call `dispose()` when you're done.
 */
export const createLinkHints = (options: LinkHintsOptions = {}): LinkHintsHandle => {
  const resolved = resolveOptions(options);
  const linkHints = new LinkHints(resolved);
  const renderer = new BadgeRenderer();

  const unsubscribe = linkHints.subscribe((state) => renderer.apply(state));
  linkHints.start();

  return {
    activate: () => linkHints.activate(),
    cancel: () => linkHints.cancel(),
    subscribe: (listener) => linkHints.subscribe(listener),
    getState: () => linkHints.getState(),
    dispose: () => {
      unsubscribe();
      renderer.teardown();
      linkHints.dispose();
    }
  };
};

export type { LinkHintsHandle, LinkHintsOptions, LinkHintsState };
export { simulateClick, performTargetAction } from './utils/click-simulator.js';
export { findClickableElements } from './utils/clickable-elements.js';
export { assignHintLabels, DEFAULT_HINT_CHARS, resolveHintChars } from './utils/hint-labels.js';
export type { HintCharsOption } from './utils/hint-labels.js';
export { getStableElementKey } from './utils/stable-element-key.js';
