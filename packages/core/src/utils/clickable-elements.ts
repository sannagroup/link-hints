// Detection logic for clickable / interactable DOM elements.
//
// Ported from Vimium's `content_scripts/link_hints.js` (`getLocalHintsForElement`
// and `getLocalHints`). The point is to mirror Vimium's verdicts so an element
// only gets a hint if Vimium would also have hinted it.
//
// https://github.com/philc/vimium

interface ClickableEvaluation {
  clickable: boolean;
  /** Element only matched because it has tabindex>=0; show it only if it doesn't overlap a real clickable. */
  onlyTabIndex: boolean;
  /** Element matched a heuristic (span / "button"-classname) that often catches wrappers around real clickables. */
  possibleFalsePositive: boolean;
}

const CLICKABLE_ROLES = new Set([
  'button',
  'tab',
  'link',
  'checkbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'radio',
  'textbox',
  'switch',
  'option'
]);

const evaluateClickability = (element: HTMLElement): ClickableEvaluation => {
  const tagName = element.tagName.toLowerCase();

  // aria-disabled elements are never hinted (Vimium #3501 discussion).
  const ariaDisabled = element.getAttribute('aria-disabled');
  if (ariaDisabled && ['', 'true'].includes(ariaDisabled.toLowerCase())) {
    return {
      clickable: false,
      onlyTabIndex: false,
      possibleFalsePositive: false
    };
  }

  let clickable = false;

  // Explicit click attributes.
  if (element.hasAttribute('onclick')) clickable = true;

  // Role attribute.
  if (!clickable) {
    const role = element.getAttribute('role');
    if (role && CLICKABLE_ROLES.has(role.toLowerCase())) clickable = true;
  }

  // contenteditable.
  if (!clickable) {
    const contentEditable = element.getAttribute('contenteditable');
    if (
      contentEditable !== null &&
      ['', 'contenteditable', 'true', 'plaintext-only'].includes(contentEditable.toLowerCase())
    ) {
      clickable = true;
    }
  }

  // Native tag names.
  if (!clickable) {
    switch (tagName) {
      case 'a':
        clickable = true;
        break;
      case 'textarea': {
        const textarea = element as HTMLTextAreaElement;
        clickable = !textarea.disabled && !textarea.readOnly;
        break;
      }
      case 'input': {
        const input = element as HTMLInputElement;
        const type = (input.getAttribute('type') ?? '').toLowerCase();
        clickable = type !== 'hidden' && !input.disabled;
        break;
      }
      case 'button':
      case 'select': {
        const formElement = element as HTMLButtonElement | HTMLSelectElement;
        clickable = !formElement.disabled;
        break;
      }
      case 'object':
      case 'embed':
      case 'details':
      case 'summary':
        clickable = true;
        break;
      case 'label': {
        const label = element as HTMLLabelElement;
        clickable = label.control != null && !(label.control as HTMLInputElement).disabled;
        break;
      }
      case 'img':
        // Vimium: only clickable when the cursor is a zoom-in/out variant.
        clickable = ['zoom-in', 'zoom-out'].includes(element.style.cursor);
        break;
    }
  }

  // Class name containing "button" / "btn" — often wrappers, so flag false-positive.
  let possibleFalsePositive = false;
  if (!clickable) {
    const className = element.getAttribute('class')?.toLowerCase();
    if (className && (className.includes('button') || className.includes('btn'))) {
      clickable = true;
      possibleFalsePositive = true;
    }
  }

  // Spans matched by some other heuristic are usually wrappers around real clickables.
  if (clickable && tagName === 'span') {
    possibleFalsePositive = true;
  }

  // Tabindex >= 0 → clickable but second-class.
  let onlyTabIndex = false;
  if (!clickable) {
    const tabIndexValue = element.getAttribute('tabindex');
    if (tabIndexValue !== null) {
      const tabIndex = parseInt(tabIndexValue, 10);
      if (!Number.isNaN(tabIndex) && tabIndex >= 0) {
        clickable = true;
        onlyTabIndex = true;
      }
    }
  }

  return { clickable, onlyTabIndex, possibleFalsePositive };
};

const isInViewport = (rect: DOMRect): boolean => {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
};

const isVisuallyVisible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
};

const isReachableAtCenter = (element: HTMLElement, rect: DOMRect): boolean => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const hit = document.elementFromPoint(centerX, centerY);
  if (!hit) return false;
  return hit === element || element.contains(hit) || hit.contains(element);
};

const rectsOverlap = (first: DOMRect, second: DOMRect): boolean => {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
};

interface Candidate {
  element: HTMLElement;
  rect: DOMRect;
  evaluation: ClickableEvaluation;
}

/**
 * Returns visible, interactable elements within `root` whose bounding rects
 * intersect the viewport. The detection rules and false-positive / tabindex
 * filtering follow Vimium's `getLocalHintsForElement` algorithm.
 */
export const findClickableElements = (
  root: HTMLElement,
  override?: (element: HTMLElement) => boolean | undefined
): HTMLElement[] => {
  const all = Array.from(root.querySelectorAll<HTMLElement>('*'));

  const candidates: Candidate[] = [];
  for (const element of all) {
    const overridden = override?.(element);
    if (overridden === false) continue;
    let evaluation = evaluateClickability(element);
    if (overridden === true) {
      evaluation = {
        clickable: true,
        onlyTabIndex: false,
        possibleFalsePositive: false
      };
    }
    if (!evaluation.clickable) continue;
    const rect = element.getBoundingClientRect();
    if (!isInViewport(rect)) continue;
    if (!isVisuallyVisible(element)) continue;
    if (!isReachableAtCenter(element, rect)) continue;
    candidates.push({ element, rect, evaluation });
  }

  const candidateSet = new Set(candidates.map((candidate) => candidate.element));

  // Drop possible-false-positive elements (spans or "btn"-classname matches)
  // when they contain a real clickable descendant — the descendant is the
  // actual interactive target.
  const afterFalsePositive = candidates.filter((candidate) => {
    if (!candidate.evaluation.possibleFalsePositive) return true;
    for (const other of candidates) {
      if (other === candidate) continue;
      if (other.evaluation.possibleFalsePositive) continue;
      if (candidate.element.contains(other.element)) return false;
    }
    return true;
  });

  // Drop tabindex-only elements that overlap a real clickable — they're
  // typically focusable wrappers, and the inner element is the action.
  const realClickables = afterFalsePositive.filter(
    (candidate) => !candidate.evaluation.onlyTabIndex
  );
  const final = afterFalsePositive.filter((candidate) => {
    if (!candidate.evaluation.onlyTabIndex) return true;
    for (const real of realClickables) {
      if (rectsOverlap(candidate.rect, real.rect)) return false;
    }
    return true;
  });

  // Drop nested elements that are visually the same target as a clickable
  // ancestor (parent rect is roughly the same size). Wide rows wrapping a
  // small action button keep both hints because their areas differ.
  const finalByElement = new Map<HTMLElement, Candidate>(
    final.map((candidate) => [candidate.element, candidate])
  );
  return final
    .filter((candidate) => {
      const area = candidate.rect.width * candidate.rect.height;
      let parent = candidate.element.parentElement;
      while (parent) {
        const parentCandidate = finalByElement.get(parent);
        if (parentCandidate && candidateSet.has(parent)) {
          const parentArea = parentCandidate.rect.width * parentCandidate.rect.height;
          if (parentArea <= area * 1.8) return false;
        }
        parent = parent.parentElement;
      }
      return true;
    })
    .map((candidate) => candidate.element);
};
