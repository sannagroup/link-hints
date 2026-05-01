---
'@sannagroup/link-hints': patch
---

Fix Node ESM resolution by adding explicit `.js` extensions to relative imports in source. Previously the published `dist/index.js` emitted `import ... from './badge-renderer'` which Node ESM (used by Vite SSR, Next.js server, etc.) cannot resolve, producing `Cannot find module '.../dist/badge-renderer'` at import time.
