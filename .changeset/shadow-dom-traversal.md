---
'@sannagroup/link-hints': minor
---

Hint detection now descends into open shadow roots, mirroring Vimium's `getAllElements`. Components built on web components (Lit, Stencil, Shoelace, custom `<sl-button>`-style wrappers) now receive hints. Closed shadow roots remain inaccessible by spec.
