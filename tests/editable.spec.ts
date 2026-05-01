import { describe, expect, it } from 'vitest';
import { isEditableElement, isTextEntryInput } from '../src/utils/editable';

const makeInput = (type: string): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = type;
  return input;
};

describe('isTextEntryInput', () => {
  it('accepts text-entry types', () => {
    for (const type of ['text', 'search', 'email', 'password', 'tel', 'url', 'number']) {
      expect(isTextEntryInput(makeInput(type))).toBe(true);
    }
  });

  it('rejects non-text-entry types', () => {
    for (const type of ['button', 'submit', 'reset', 'checkbox', 'radio']) {
      expect(isTextEntryInput(makeInput(type))).toBe(false);
    }
  });

  it('treats default (no type set) as text-entry', () => {
    const input = document.createElement('input');
    expect(isTextEntryInput(input)).toBe(true);
  });
});

describe('isEditableElement', () => {
  it('returns false for null', () => {
    expect(isEditableElement(null)).toBe(false);
  });

  it('returns true for text-entry inputs', () => {
    expect(isEditableElement(makeInput('text'))).toBe(true);
    expect(isEditableElement(makeInput('email'))).toBe(true);
  });

  it('returns false for button-like inputs', () => {
    expect(isEditableElement(makeInput('button'))).toBe(false);
    expect(isEditableElement(makeInput('checkbox'))).toBe(false);
    expect(isEditableElement(makeInput('radio'))).toBe(false);
  });

  it('returns true for textarea and select', () => {
    expect(isEditableElement(document.createElement('textarea'))).toBe(true);
    expect(isEditableElement(document.createElement('select'))).toBe(true);
  });

  it('returns true for contentEditable elements', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    expect(isEditableElement(div)).toBe(true);
  });

  it('returns false for non-editable elements', () => {
    expect(isEditableElement(document.createElement('div'))).toBe(false);
    expect(isEditableElement(document.createElement('a'))).toBe(false);
    expect(isEditableElement(document.createElement('button'))).toBe(false);
  });
});
