const NON_TEXT_INPUT_TYPES = ['button', 'submit', 'reset', 'checkbox', 'radio'];

export const isTextEntryInput = (input: HTMLInputElement): boolean =>
  !NON_TEXT_INPUT_TYPES.includes(input.type);

export const isContentEditable = (element: HTMLElement): boolean =>
  element.isContentEditable === true || element.contentEditable === 'true';

export const isEditableElement = (element: Element | null): boolean => {
  if (!element) return false;
  if (element.tagName === 'INPUT') {
    return isTextEntryInput(element as HTMLInputElement);
  }
  if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
    return true;
  }
  return isContentEditable(element as HTMLElement);
};
