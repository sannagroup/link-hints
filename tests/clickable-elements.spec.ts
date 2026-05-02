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

const collectAllElements = (root: ParentNode): HTMLElement[] => {
  const all: HTMLElement[] = [];
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    all.push(element);
    if (element.shadowRoot) all.push(...collectAllElements(element.shadowRoot));
  }
  return all;
};

const stubElementFromPoint = (): void => {
  document.elementFromPoint = (x: number, y: number): Element | null => {
    for (const element of collectAllElements(document)) {
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

  it('descends into open shadow roots to find clickables', () => {
    const host = make('div', { id: 'host' });
    const shadow = host.attachShadow({ mode: 'open' });
    const shadowButton = document.createElement('button');
    shadowButton.id = 'inside-shadow';
    shadow.appendChild(shadowButton);
    stubRect(shadowButton, { top: 100, bottom: 124, height: 24 });

    const result = findClickableElements(document.body);

    expect(result.map((element) => element.id)).toContain('inside-shadow');
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

  it('drops "btn"-classed wrappers that contain a real clickable descendant', () => {
    const wrapper = make('div', { id: 'wrapper', class: 'btn-shell' });
    const inner = document.createElement('button');
    inner.id = 'inner';
    wrapper.appendChild(inner);
    stubRect(inner);
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['inner']);
  });

  it('treats spans matched by other heuristics as possible false positives', () => {
    const span = make('span', { id: 'span', role: 'button' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['span']);
  });

  it('finds <label> with an enabled control and skips orphan or disabled-control labels', () => {
    const wired = make('label', { id: 'wired', for: 'wired-input' });
    make('input', { id: 'wired-input', type: 'text' });

    const orphan = make('label', { id: 'orphan' });

    const disabled = make('label', { id: 'disabled-label', for: 'disabled-input' });
    make('input', { id: 'disabled-input', type: 'text', disabled: '' });

    const result = findClickableElements(document.body);
    const ids = result.map((element) => element.id);
    expect(ids).toContain('wired');
    expect(ids).not.toContain('orphan');
    expect(ids).not.toContain('disabled-label');
    expect(disabled).toBeDefined();
  });

  it('finds <img> only when its cursor style is zoom-in / zoom-out', () => {
    const zoomable = make('img', { id: 'zoomable' });
    zoomable.style.cursor = 'zoom-in';
    make('img', { id: 'plain' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['zoomable']);
  });

  it('skips aria-disabled elements', () => {
    make('button', { id: 'enabled' });
    make('button', { id: 'aria-disabled', 'aria-disabled': 'true' });
    make('button', { id: 'aria-disabled-mixed', 'aria-disabled': 'TRUE' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['enabled']);
  });

  it('finds elements with an onclick attribute', () => {
    make('div', { id: 'clickable', onclick: 'noop()' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['clickable']);
  });

  it('finds enabled textareas but skips disabled or readonly ones', () => {
    make('textarea', { id: 'ta-enabled' });
    make('textarea', { id: 'ta-disabled', disabled: '' });
    make('textarea', { id: 'ta-readonly', readonly: '' });
    const result = findClickableElements(document.body);
    expect(result.map((element) => element.id)).toEqual(['ta-enabled']);
  });

  it('finds <details> and <summary>', () => {
    make('details', { id: 'details' });
    make('summary', { id: 'summary' });
    const result = findClickableElements(document.body);
    const ids = result.map((element) => element.id).sort();
    expect(ids).toEqual(['details', 'summary']);
  });
});
