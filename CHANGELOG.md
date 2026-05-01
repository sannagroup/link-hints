# @sannagroup/link-hints

## 0.2.1

### Patch Changes

- b83449a: Internal: reorganize `src/` — move stateless helpers under `utils/`, move CSS under `style/`, rename `controller.ts` to `link-hints.ts` and the internal class `LinkHintsController` to `LinkHints`. Flatten the repo layout: drop the bun-workspaces monorepo and publish `@sannagroup/link-hints` directly from the root. No public API change.

## 0.2.0

### Minor Changes

- 10ddee0: Initial release. Vimium-style keyboard link-hint navigation, framework-free. Press `f` to label every visible interactive element, type the label to click it. README has integration recipes for Svelte, React, Vue, Solid, and Web Components.
