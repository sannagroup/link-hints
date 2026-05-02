import { findClickableElements } from './utils/clickable-elements.js';
import { Emitter } from './utils/emitter.js';
import { assignHintLabels } from './utils/hint-labels.js';
import { getStableElementKey } from './utils/stable-element-key.js';
import { performTargetAction } from './utils/click-simulator.js';
import { isEditableElement } from './utils/editable.js';
import type { LinkHintsOptions, LinkHintsState } from './types.js';

/**
 * Vimium-style hint-mode state machine. Pure JS — owns no DOM beyond
 * dispatching events and inspecting the document. The badge renderer
 * subscribes to state changes and updates the DOM separately.
 */
export class LinkHints {
  private state: LinkHintsState = {
    status: 'idle',
    hints: new Map(),
    typedPrefix: ''
  };
  private readonly emitter = new Emitter<LinkHintsState>();

  /**
   * Per-route memory of `stableElementKey -> label` from previous
   * activations. Re-used as soft pins so unchanged elements keep their
   * label across activations and within-session navigations.
   */
  private readonly previousAssignmentsByRoute = new Map<string, Map<string, string>>();

  private keydownListener: ((event: KeyboardEvent) => void) | undefined;
  private layoutShiftListener: (() => void) | undefined;

  constructor(private readonly options: Required<LinkHintsOptions>) {}

  start(): void {
    if (typeof window === 'undefined') return;
    this.keydownListener = (event) => this.handleKey(event);
    window.addEventListener('keydown', this.keydownListener, { capture: true });
  }

  dispose(): void {
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener, {
        capture: true
      });
      this.keydownListener = undefined;
    }
    this.detachLayoutListeners();
    this.setState({ status: 'idle', hints: new Map(), typedPrefix: '' });
    this.emitter.clear();
  }

  getState(): LinkHintsState {
    return this.state;
  }

  subscribe(listener: (state: LinkHintsState) => void): () => void {
    return this.emitter.subscribe(listener);
  }

  activate(): void {
    if (this.state.status === 'active') return;
    if (isEditableElement(document.activeElement)) return;

    const elements = findClickableElements(this.options.root, this.options.isClickable);
    if (elements.length === 0) return;

    const hardPinned = this.collectPinnedHints(elements);

    const routeKey = typeof window === 'undefined' ? '' : window.location.pathname;
    const remembered = this.previousAssignmentsByRoute.get(routeKey) ?? new Map<string, string>();

    const stableKeys = new Map<HTMLElement, string>();
    for (const element of elements) {
      stableKeys.set(element, getStableElementKey(element));
    }

    const claimed = new Set<string>([...hardPinned.values()].map((label) => label.toUpperCase()));
    const softPinned = new Map<HTMLElement, string>();
    for (const element of elements) {
      if (hardPinned.has(element)) continue;
      const key = stableKeys.get(element);
      if (!key) continue;
      const previous = remembered.get(key);
      if (!previous) continue;
      const upper = previous.toUpperCase();
      if (claimed.has(upper)) continue;
      softPinned.set(element, previous);
      claimed.add(upper);
    }

    const allPinned = new Map<HTMLElement, string>([...hardPinned, ...softPinned]);
    const labels = assignHintLabels(elements, {
      pinned: allPinned,
      hintChars: this.options.hintChars
    });

    const updated = new Map(remembered);
    for (const [element, label] of labels) {
      const key = stableKeys.get(element);
      if (key) updated.set(key, label);
    }
    this.previousAssignmentsByRoute.set(routeKey, updated);

    this.setState({ status: 'active', hints: labels, typedPrefix: '' });
    this.attachLayoutListeners();
  }

  cancel(): void {
    if (this.state.status === 'idle') return;
    this.setState({ status: 'idle', hints: new Map(), typedPrefix: '' });
    this.detachLayoutListeners();
  }

  handleKey(event: KeyboardEvent): void {
    if (event.repeat) return;

    if (this.state.status === 'idle') {
      if (
        event.key === this.options.activationKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        !isEditableElement(document.activeElement)
      ) {
        event.preventDefault();
        this.activate();
      }
      return;
    }

    // Active: swallow every keydown so component-level typeahead can't
    // steal focus before our click lands.
    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.key === 'Escape') {
      this.cancel();
      return;
    }
    if (event.key === 'Backspace') {
      this.setState({
        ...this.state,
        typedPrefix: this.state.typedPrefix.slice(0, -1)
      });
      return;
    }
    if (/^[a-zA-Z0-9]$/.test(event.key)) {
      const next = this.state.typedPrefix + event.key.toUpperCase();
      const matches = this.matchingForPrefix(next);
      if (matches.length === 1) {
        const target = matches[0];
        if (target) {
          this.cancel();
          this.options.onActivate(target);
        }
        return;
      }
      if (matches.length === 0) {
        this.cancel();
        return;
      }
      this.setState({ ...this.state, typedPrefix: next });
    }

    // Unknown keys: swallowed but do NOT cancel — matches Vimium's
    // suppressEvent so a stray modifier press doesn't kick the user out.
  }

  private matchingForPrefix(prefix: string): HTMLElement[] {
    const matches: HTMLElement[] = [];
    for (const [element, label] of this.state.hints) {
      if (label.startsWith(prefix)) matches.push(element);
    }
    return matches;
  }

  private collectPinnedHints(elements: readonly HTMLElement[]): Map<HTMLElement, string> {
    const pinned = new Map<HTMLElement, string>();
    for (const element of elements) {
      const value = this.options.pinnedHint(element);
      if (value) pinned.set(element, value);
    }
    return pinned;
  }

  private attachLayoutListeners(): void {
    this.layoutShiftListener = () => this.cancel();
    window.addEventListener('scroll', this.layoutShiftListener, {
      capture: true,
      passive: true
    });
    window.addEventListener('resize', this.layoutShiftListener, {
      passive: true
    });
  }

  private detachLayoutListeners(): void {
    if (!this.layoutShiftListener) return;
    window.removeEventListener('scroll', this.layoutShiftListener, {
      capture: true
    });
    window.removeEventListener('resize', this.layoutShiftListener);
    this.layoutShiftListener = undefined;
  }

  private setState(next: LinkHintsState): void {
    this.state = next;
    this.emitter.emit(next);
  }
}

/** Default `onActivate` is the Vimium-faithful click sequence. */
export const defaultOnActivate = performTargetAction;
