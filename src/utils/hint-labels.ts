import { getStableElementKey } from './stable-element-key.js';

/** Vimium's home-row-weighted character set. Alphabetic only so digit input never collides. */
export const DEFAULT_HINT_CHARS = 'sadfjklewcmpgh';

const isReserved = (candidate: string, reservedLabels: ReadonlySet<string>): boolean => {
  // Candidate is reserved if it equals a reserved label, or shares a prefix
  // with one (typing the candidate would be ambiguous with the reserved label).
  for (const reserved of reservedLabels) {
    if (
      candidate === reserved ||
      candidate.startsWith(reserved) ||
      reserved.startsWith(candidate)
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Generates labels of `length` so the earliest-issued labels alternate around
 * the character set, giving common elements ergonomic distributions across
 * both hands (Vimium-equivalent ordering).
 */
const generateLabels = (length: number, chars: string): string[] => {
  if (length <= 0) return [''];
  const previous = generateLabels(length - 1, chars);
  const labels: string[] = [];
  for (const character of chars) {
    for (const tail of previous) {
      labels.push(character + tail);
    }
  }
  return labels;
};

const validatePinned = (pinned: ReadonlyMap<HTMLElement, string>): Map<HTMLElement, string> => {
  const validated = new Map<HTMLElement, string>();
  const seen = new Set<string>();
  for (const [element, label] of pinned) {
    const upper = label.toUpperCase();
    if (!/^[A-Z]{1,3}$/.test(upper)) {
      throw new Error(`invalid pinned hint "${label}": must be 1-3 letters`);
    }
    if (seen.has(upper)) {
      throw new Error(`duplicate pinned hint "${upper}"`);
    }
    seen.add(upper);
    validated.set(element, upper);
  }
  return validated;
};

export interface AssignHintLabelsOptions {
  /** Element to literal-label mapping. Reserved together with their prefixes. */
  pinned?: ReadonlyMap<HTMLElement, string>;
  /** Character set used for generated labels. Default: `DEFAULT_HINT_CHARS`. */
  hintChars?: string;
}

/**
 * Assigns deterministic, ergonomic labels to a list of elements. Elements are
 * sorted by their stable key (see `stable-element-key.ts`) so the same input
 * always yields the same labels. Pinned labels are honored; their prefixes
 * are reserved to avoid input ambiguity.
 */
export const assignHintLabels = (
  elements: readonly HTMLElement[],
  options: AssignHintLabelsOptions = {}
): Map<HTMLElement, string> => {
  const pinned = validatePinned(options.pinned ?? new Map());
  const reserved = new Set(pinned.values());
  const chars = (options.hintChars ?? DEFAULT_HINT_CHARS).toUpperCase();
  if (!/^[A-Z]+$/.test(chars)) {
    throw new Error('hintChars must contain alphabetic characters only');
  }

  const remaining = elements
    .filter((element) => !pinned.has(element))
    .map((element) => ({ element, key: getStableElementKey(element) }))
    .sort((first, second) => first.key.localeCompare(second.key));

  const result = new Map<HTMLElement, string>(pinned);
  if (remaining.length === 0) return result;

  let labelLength = 1;
  let candidates: string[] = [];
  while (labelLength <= 3) {
    candidates = generateLabels(labelLength, chars).filter((label) => !isReserved(label, reserved));
    if (candidates.length >= remaining.length) break;
    labelLength += 1;
  }

  for (let index = 0; index < remaining.length; index += 1) {
    const entry = remaining[index];
    const label = candidates[index];
    if (!entry || !label) {
      throw new Error(`ran out of hint labels at length 3 for ${remaining.length} elements`);
    }
    result.set(entry.element, label);
  }

  return result;
};
