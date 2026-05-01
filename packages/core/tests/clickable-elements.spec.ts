import { describe, expect, it, beforeEach } from 'vitest';
import { findClickableElements } from '../src/utils/clickable-elements';

const stubViewport = (width = 1024, height = 768): void => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true
  });
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    configurable: true
  });
};

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

let nextOffset = 0;

const make = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {}
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  document.body.appendChild(element);
  // Stack elements vertically so elementFromPoint hits the correct one
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
  document.elementFromPoint = (x: number, y: number): Element | null => {
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

describe('findClickableElements', () => {
  beforeEach(() => {
    stubViewport();
    document.body.replaceChildren();
    nextOffset = 0;
    stubElementFromPoint();
  });

  it('finds anchor links with href', () => {
    make('a', { href: '/x', id: 'link' });
    const result = findClickableElements(document.body);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('link');
  });

  it('finds enabled buttons but skips disabled ones', () => {
    make('button', { id: 'enabled' });
    make('button', { id: 'disabled', disabled: '' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['enabled']);
  });

  it('finds inputs except hidden and disabled', () => {
    make('input', { id: 'text', type: 'text' });
    make('input', { id: 'hidden', type: 'hidden' });
    make('input', { id: 'disabled', disabled: '' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['text']);
  });

  it('finds elements with role="button" and tabindex', () => {
    make('div', { id: 'role', role: 'button' });
    make('div', { id: 'tab', tabindex: '0' });
    make('div', { id: 'ignored', tabindex: '-1' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id).sort()).toEqual(['role', 'tab']);
  });

  it('finds contenteditable elements', () => {
    make('div', { id: 'edit', contenteditable: 'true' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['edit']);
  });

  it('drops elements with zero size', () => {
    const element = make('button', { id: 'zero' });
    stubRect(element, { width: 0, height: 0, right: 0, bottom: 0 });
    const result = findClickableElements(document.body);
    expect(result).toHaveLength(0);
  });

  it('drops elements outside the viewport', () => {
    const element = make('button', { id: 'below' });
    stubRect(element, {
      top: 1000,
      bottom: 1024,
      left: 0,
      right: 100,
      width: 100,
      height: 24
    });
    const result = findClickableElements(document.body);
    expect(result).toHaveLength(0);
  });

  it('drops display:none / visibility:hidden / opacity:0', () => {
    make('button', { id: 'none', style: 'display: none' });
    make('button', { id: 'hidden', style: 'visibility: hidden' });
    make('button', { id: 'transparent', style: 'opacity: 0' });
    make('button', { id: 'ok' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['ok']);
  });

  it('keeps the outermost interactable when nested', () => {
    const outer = make('a', { href: '/x', id: 'outer' });
    const inner = document.createElement('button');
    inner.id = 'inner';
    outer.appendChild(inner);
    stubRect(inner);
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['outer']);
  });
});
