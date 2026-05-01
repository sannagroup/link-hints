---
'@sannagroup/link-hints': patch
---

Internal: reorganize `src/` — move stateless helpers under `utils/`, move CSS under `style/`, rename `controller.ts` to `link-hints.ts` and the internal class `LinkHintsController` to `LinkHints`. Flatten the repo layout: drop the bun-workspaces monorepo and publish `@sannagroup/link-hints` directly from the root. No public API change.
