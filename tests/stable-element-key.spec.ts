import { describe, expect, it, beforeEach } from 'vitest';
import { getStableElementKey } from '../src/utils/stable-element-key';

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
  return element;
};

describe('getStableElementKey', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('returns dataset.hintId verbatim when present', () => {
    const button = make('button', { 'data-hint-id': 'open-org-picker' });
    document.body.appendChild(button);
    expect(getStableElementKey(button)).toBe('open-org-picker');
  });

  it('returns the same key when an identical DOM structure is rebuilt', () => {
    const buildAndKey = (): string => {
      document.body.replaceChildren();
      const wrapper = document.createElement('div');
      const button = make('button', {}, 'Submit');
      wrapper.appendChild(button);
      document.body.appendChild(wrapper);
      return getStableElementKey(button);
    };
    expect(buildAndKey()).toBe(buildAndKey());
  });

  it('returns different keys for elements at different DOM positions', () => {
    const buttonA = make('button', {}, 'Submit');
    const buttonB = make('button', {}, 'Submit');
    document.body.append(buttonA, buttonB);
    expect(getStableElementKey(buttonA)).not.toBe(getStableElementKey(buttonB));
  });

  it('uses aria-label over textContent for the accessible name', () => {
    const button = make('button', { 'aria-label': 'Open menu' }, 'a');
    document.body.appendChild(button);
    const keyWithLabelA = getStableElementKey(button);

    button.textContent = 'b';
    const keyWithLabelB = getStableElementKey(button);

    expect(keyWithLabelA).toBe(keyWithLabelB);
  });

  it('is sensitive to role differences', () => {
    const button = make('div', { role: 'button' }, 'x');
    document.body.appendChild(button);
    const buttonKey = getStableElementKey(button);

    button.setAttribute('role', 'link');
    const linkKey = getStableElementKey(button);

    expect(buttonKey).not.toBe(linkKey);
  });

  it('is deterministic across calls', () => {
    const button = make('button', {}, 'Submit');
    document.body.appendChild(button);
    expect(getStableElementKey(button)).toBe(getStableElementKey(button));
  });
});
