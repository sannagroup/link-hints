import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLinkHints } from '../src/index';
import type { LinkHintsHandle } from '../src/index';

const stubRect = (element: Element, rect: Partial<DOMRect> = {}): void => {
  (element as HTMLElement).getBoundingClientRect = (): DOMRect =>
    ({
      top: 0,
      left: 0,
      width: 100,
      height: 24,
      bottom: 24,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect
    }) as DOMRect;
};

const setViewport = (): void => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
};

let nextOffset = 0;

const make = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  text?: string
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  if (text !== undefined) element.textContent = text;
  document.body.appendChild(element);
  stubRect(element, {
    top: nextOffset,
    bottom: nextOffset + 24,
    height: 24,
    left: 0,
    right: 100,
    width: 100
  });
  nextOffset += 30;
  return element;
};

const stubElementFromPoint = (): void => {
  document.elementFromPoint = (x, y): Element | null => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return element;
      }
    }
    return document.body;
  };
};

const pressKey = (key: string): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};

describe('createLinkHints', () => {
  let hints: LinkHintsHandle | undefined;

  beforeEach(() => {
    setViewport();
    document.body.replaceChildren();
    nextOffset = 0;
    stubElementFromPoint();
  });

  afterEach(() => {
    hints?.dispose();
    hints = undefined;
  });

  it('starts idle with no hints', () => {
    hints = createLinkHints();
    expect(hints.getState()).toEqual({
      status: 'idle',
      hints: new Map(),
      typedPrefix: ''
    });
  });

  it('activates on the configured key and renders badges in a portal', () => {
    make('button', { id: 'a' }, 'A');
    make('button', { id: 'b' }, 'B');
    hints = createLinkHints();

    pressKey('f');

    expect(hints.getState().status).toBe('active');
    expect(hints.getState().hints.size).toBe(2);
    const portal = document.querySelector('.link-hints-portal');
    expect(portal).not.toBeNull();
    expect(portal?.querySelectorAll('.link-hints-badge').length).toBe(2);
  });

  it('uses a custom activationKey', () => {
    make('button', { id: 'a' }, 'A');
    hints = createLinkHints({ activationKey: 'g' });

    pressKey('f');
    expect(hints.getState().status).toBe('idle');
    pressKey('g');
    expect(hints.getState().status).toBe('active');
  });

  it('respects pinnedHint option', () => {
    const button = make('button', { id: 'pin' }, 'Pin');
    hints = createLinkHints({
      pinnedHint: (element) => (element.id === 'pin' ? 'OP' : undefined)
    });
    hints.activate();
    expect(hints.getState().hints.get(button)).toBe('OP');
  });

  it('calls onActivate with the matched element', () => {
    const button = make('button', { id: 'only' }, 'Only');
    const onActivate = vi.fn();
    hints = createLinkHints({ onActivate });
    hints.activate();
    const label = hints.getState().hints.get(button);
    expect(label).toBeDefined();

    if (label) for (const character of label) pressKey(character.toLowerCase());

    expect(onActivate).toHaveBeenCalledWith(button);
    expect(hints.getState().status).toBe('idle');
  });

  it('Escape cancels', () => {
    make('button', { id: 'a' }, 'A');
    hints = createLinkHints();
    hints.activate();
    expect(hints.getState().status).toBe('active');

    pressKey('Escape');

    expect(hints.getState().status).toBe('idle');
    expect(document.querySelector('.link-hints-portal')).toBeNull();
  });

  it('cancels on scroll', () => {
    make('button', { id: 'a' }, 'A');
    hints = createLinkHints();
    hints.activate();
    window.dispatchEvent(new Event('scroll'));
    expect(hints.getState().status).toBe('idle');
  });

  it('subscribe receives state changes and unsubscribe stops them', () => {
    make('button', { id: 'a' }, 'A');
    hints = createLinkHints();
    const listener = vi.fn();
    const unsubscribe = hints.subscribe(listener);

    hints.activate();
    expect(listener).toHaveBeenCalled();
    listener.mockClear();

    unsubscribe();
    hints.cancel();
    expect(listener).not.toHaveBeenCalled();
  });

  it('dispose tears down listeners and the portal', () => {
    make('button', { id: 'a' }, 'A');
    hints = createLinkHints();
    hints.activate();
    expect(document.querySelector('.link-hints-portal')).not.toBeNull();

    hints.dispose();
    hints = undefined;

    expect(document.querySelector('.link-hints-portal')).toBeNull();
    pressKey('f');
    // No new portal should appear after dispose.
    expect(document.querySelector('.link-hints-portal')).toBeNull();
  });

  it('isClickable override forces an element to be hinted', () => {
    const span = make('span', { id: 'spanny' }, 'span');
    hints = createLinkHints({
      isClickable: (element) => (element.id === 'spanny' ? true : undefined)
    });
    hints.activate();
    expect(hints.getState().hints.has(span)).toBe(true);
  });
});
