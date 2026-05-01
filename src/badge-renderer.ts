import type { LinkHintsState } from './types.js';

const PORTAL_CLASS = 'link-hints-portal';
const BADGE_CLASS = 'link-hints-badge';
const DIMMED_CLASS = 'link-hints-badge__typed';
const REMAINING_CLASS = 'link-hints-badge__remaining';

/**
 * Renders hint badges into a portal `<div>` appended to `document.body`.
 * Subscribes to state changes and diffs the current set of badges
 * against the new state on each update.
 *
 * Pure DOM. Framework-agnostic. The renderer never reads its own DOM —
 * the `LinkHints` instance is the single source of truth.
 */
export class BadgeRenderer {
  private portal: HTMLDivElement | undefined;
  private nodes = new Map<HTMLElement, HTMLSpanElement>();

  /** Apply a new state. Called via the emitter. */
  apply(state: LinkHintsState): void {
    if (state.status === 'idle') {
      this.teardown();
      return;
    }

    const portal = this.ensurePortal();

    // Drop badges for targets no longer in the active set.
    for (const [element, badge] of [...this.nodes]) {
      if (!state.hints.has(element)) {
        badge.remove();
        this.nodes.delete(element);
      }
    }

    for (const [target, label] of state.hints) {
      if (!label.startsWith(state.typedPrefix)) {
        const badge = this.nodes.get(target);
        if (badge) {
          badge.remove();
          this.nodes.delete(target);
        }
        continue;
      }

      const existing = this.nodes.get(target);
      const badge = existing ?? this.createBadge();
      this.populateBadge(badge, target, label, state.typedPrefix);
      if (!existing) {
        portal.appendChild(badge);
        this.nodes.set(target, badge);
      }
    }
  }

  /** Tear down everything. Idempotent. */
  teardown(): void {
    for (const node of this.nodes.values()) node.remove();
    this.nodes.clear();
    this.portal?.remove();
    this.portal = undefined;
  }

  private ensurePortal(): HTMLDivElement {
    if (this.portal && this.portal.isConnected) return this.portal;
    const portal = document.createElement('div');
    portal.className = PORTAL_CLASS;
    portal.setAttribute('aria-hidden', 'true');
    document.body.appendChild(portal);
    this.portal = portal;
    return portal;
  }

  private createBadge(): HTMLSpanElement {
    const badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    return badge;
  }

  private populateBadge(
    badge: HTMLSpanElement,
    target: HTMLElement,
    label: string,
    typed: string
  ): void {
    const rect = target.getBoundingClientRect();
    badge.style.top = `${rect.top + window.scrollY}px`;
    badge.style.left = `${rect.left + window.scrollX}px`;
    badge.replaceChildren();
    if (typed) {
      const dimmed = document.createElement('span');
      dimmed.className = DIMMED_CLASS;
      dimmed.textContent = typed;
      badge.appendChild(dimmed);
    }
    const remaining = document.createElement('span');
    remaining.className = REMAINING_CLASS;
    remaining.textContent = label.slice(typed.length);
    badge.appendChild(remaining);
  }
}
