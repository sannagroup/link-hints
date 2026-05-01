import { describe, expect, it, beforeEach } from 'vitest';
import { assignHintLabels } from '../src/utils/hint-labels';

const makeButtons = (texts: string[]): HTMLElement[] =>
  texts.map((text) => {
    const button = document.createElement('button');
    button.textContent = text;
    document.body.appendChild(button);
    return button;
  });

describe('assignHintLabels', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('assigns single-character labels when few elements', () => {
    const elements = makeButtons(['A', 'B', 'C']);
    const result = assignHintLabels(elements);
    expect(result.size).toBe(3);
    for (const label of result.values()) {
      expect(label).toHaveLength(1);
      expect(label).toMatch(/^[A-Z]$/);
    }
  });

  it('assigns longer labels when many elements', () => {
    const elements = makeButtons(Array.from({ length: 30 }, (_value, index) => `b${index}`));
    const result = assignHintLabels(elements);
    expect(result.size).toBe(30);
    const lengths = new Set(Array.from(result.values()).map((label) => label.length));
    expect(Math.max(...lengths)).toBeGreaterThanOrEqual(2);
  });

  it('returns the same labels when called twice with the same input', () => {
    const elements = makeButtons(['Foo', 'Bar', 'Baz', 'Qux']);
    const first = assignHintLabels(elements);
    const second = assignHintLabels(elements);
    for (const element of elements) {
      expect(first.get(element)).toBe(second.get(element));
    }
  });

  it('respects pinned labels and skips reserved prefixes', () => {
    const elements = makeButtons(['One', 'Two', 'Three', 'Four']);
    const firstElement = elements[0]!;
    const pinned = new Map<HTMLElement, string>([[firstElement, 'AB']]);
    const result = assignHintLabels(elements, { pinned });

    expect(result.get(firstElement)).toBe('AB');
    for (const otherElement of elements.slice(1)) {
      const label = result.get(otherElement);
      expect(label).toBeDefined();
      expect(label).not.toBe('AB');
      expect(label).not.toBe('A');
    }
  });

  it('uppercases all labels', () => {
    const elements = makeButtons(['x', 'y']);
    const result = assignHintLabels(elements);
    for (const label of result.values()) {
      expect(label).toBe(label.toUpperCase());
    }
  });

  it('produces unique labels', () => {
    const elements = makeButtons(Array.from({ length: 50 }, (_value, index) => `b${index}`));
    const result = assignHintLabels(elements);
    const labels = Array.from(result.values());
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('returns an empty map for an empty input', () => {
    expect(assignHintLabels([]).size).toBe(0);
  });
});
