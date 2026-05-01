import { createLinkHints } from '@sannagroup/link-hints';
import '@sannagroup/link-hints/style.css';

const hints = createLinkHints();

// Example: log every activation.
hints.subscribe((state) => {
  if (state.status === 'active') {
    console.log(`[link-hints] ${state.hints.size} hints rendered`);
  }
});
