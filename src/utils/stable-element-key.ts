const fnv1a = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const getAccessibleName = (element: HTMLElement): string => {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/);
    const text = ids
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
    if (text) return text;
  }

  const text = element.textContent?.trim() ?? '';
  if (text) return text.slice(0, 40);

  const placeholder = element.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();

  const title = element.getAttribute('title');
  if (title) return title.trim();

  return '';
};

const getDomPath = (element: HTMLElement): string => {
  const segments: string[] = [];
  let current: HTMLElement = element;
  while (current !== document.body && current.parentElement) {
    const parent: HTMLElement = current.parentElement;
    const tagName: string = current.tagName;
    const siblings: Element[] = Array.from(parent.children).filter(
      (sibling) => sibling.tagName === tagName
    );
    const index: number = siblings.indexOf(current);
    segments.unshift(`${tagName.toLowerCase()}:${index}`);
    current = parent;
  }
  return segments.join('>');
};

/**
 * Returns a deterministic key for ordering elements during hint label
 * assignment. Same DOM structure + accessible name → same key.
 *
 * If the element has `data-hint-id`, that value is returned verbatim
 * (explicit identity override that survives DOM refactors).
 */
export const getStableElementKey = (element: HTMLElement): string => {
  const override = element.dataset.hintId;
  if (override) return override;

  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role') ?? '';
  const name = getAccessibleName(element);
  const path = getDomPath(element);

  return fnv1a(`${tag}|${role}|${name}|${path}`);
};
