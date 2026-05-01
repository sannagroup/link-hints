import { BadgeRenderer } from './badge-renderer';
import { LinkHints, defaultOnActivate } from './link-hints';
import type { LinkHintsHandle, LinkHintsOptions, LinkHintsState } from './types';

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
export { simulateClick, performTargetAction } from './utils/click-simulator';
export { findClickableElements } from './utils/clickable-elements';
export { assignHintLabels, DEFAULT_HINT_CHARS } from './utils/hint-labels';
export { getStableElementKey } from './utils/stable-element-key';
