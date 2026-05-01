# AGENTS.md

Guidance for AI coding agents (Claude, Cursor, Aider, Codex, etc.) working in this repo.

## What this repo is

`link-hints` is a small open-source library that ports [Vimium](https://github.com/philc/vimium)'s clickable-element detection and link-hint UX into a JavaScript/TypeScript library you can embed in any web page. Press `f`, see labels appear over every clickable element, type a label to click it.

It is published as a single npm package at `@sannagroup/link-hints`. The package is **framework-free**: zero runtime dependencies, no UI-framework lock-in. The README shows recipes for wrapping it into Svelte / React / Vue / Solid / Web Components — those wrappers are 5–10 lines each, so we don't ship them. Less code to maintain, no peer-dep complexity, and consumers can wire it into whatever stack they're on.

## Repo layout

```
hint-mode/
├── packages/core/          → @sannagroup/link-hints (the only published package)
│   ├── src/
│   │   ├── index.ts                     public exports
│   │   ├── types.ts                     LinkHintsOptions, LinkHintsHandle, LinkHintsState
│   │   ├── link-hints.ts                LinkHints class — state machine + emitter
│   │   ├── badge-renderer.ts            vanilla DOM rendering
│   │   ├── style/
│   │   │   └── style.css                default theme + CSS variables
│   │   └── utils/                       stateless helpers
│   │       ├── clickable-elements.ts    Vimium's getLocalHintsForElement, ported
│   │       ├── click-simulator.ts       Vimium's 7-event simulateClick + performTargetAction
│   │       ├── hint-labels.ts           label generation + assignment
│   │       ├── stable-element-key.ts    deterministic key for muscle-memory ordering
│   │       └── emitter.ts               tiny synchronous Emitter, no deps
│   ├── tests/                           vitest specs (JSDOM)
│   ├── tsconfig.json                    typecheck config
│   ├── tsconfig.build.json              build config
│   ├── vitest.config.ts                 jsdom env
│   └── package.json
├── examples/
│   └── vanilla/                         plain HTML + Vite, demonstrates the lib
├── .changeset/                          Changesets — every PR with code changes
│                                        should add one
├── .github/workflows/
│   ├── ci.yml                           lint + typecheck + test + build on PR
│   └── release.yml                      Changesets-driven publish on main
├── tsconfig.base.json                   shared strict TS config
├── README.md                            full user-facing docs
├── LICENSE                              MIT
├── NOTICE                               Vimium attribution — required by MIT
└── package.json                         monorepo root, bun workspaces
```

## Tooling

- **Runtime/build:** [Bun](https://bun.sh) is the package manager.
- **Workspaces:** Bun workspaces. Only `packages/core` publishes; `examples/*` are private.
- **Type-check:** `tsc -p tsconfig.json` (no emit, covers `src/` and `tests/`).
- **Test:** [Vitest](https://vitest.dev) with `jsdom`.
- **Build:** `tsc -p tsconfig.build.json` then `cp src/style/style.css dist/style.css`.
- **Lint:** Prettier only.
- **Versioning:** [Changesets](https://github.com/changesets/changesets). `bun changeset` records a versioned change.

## Common commands

```bash
bun install
bun run --filter='./packages/*' test
bun run --filter='./packages/*' typecheck
bun run --filter='./packages/*' build
bun run lint
bun run format
bun changeset
bun --cwd examples/vanilla dev
```

## Conventions agents must follow

These are non-negotiable.

### Coding style

- **Strict TypeScript.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. Don't relax them.
- **Arrow function expressions, not declarations.**
- **Explicit return types on exported functions and test helpers.**
- **No abbreviations** (`organization` not `org`, `element` not `el`, `event` not `e`).
- **No comments that just restate the code.** Comment only the _why_.
- **Extract complex inline expressions** into named consts before testing in `if` / `while` / argument positions.
- **Use `??` over `||`** for object-or-undefined fallbacks.
- **Use `undefined`, not `null`,** in option / public-API surfaces.
- **No re-exports through barrel layers** — public surface lives in `src/index.ts`.
- **Format with Prettier on every commit.**

### Architectural rules

- **Zero framework dependencies.** Don't add a peer dep on Svelte/React/Vue/etc. The library is meant to be wrapped by consumers; the README shows them how. New framework integrations belong in the README's "Framework integration" section, not as a new package.
- **Don't break the `LinkHints` / renderer split.** The `LinkHints` instance (in `src/link-hints.ts`) mutates state and emits via the `Emitter`. The renderer subscribes and updates DOM. The renderer never reads its own DOM.
- **The detection rules in `utils/clickable-elements.ts` mirror Vimium's `getLocalHintsForElement`.** If you change them, document precisely what diverges and why.
- **The click sequence in `utils/click-simulator.ts` mirrors Vimium's `simulateClick`.** Same constraint.
- **No `localStorage` / `sessionStorage` / cookies.** Per-route stability is in-memory only.
- **No global side effects on import.**
- **`dispose()` must be idempotent.**

### Public API stability

- The shape of `createLinkHints(options)` and `LinkHintsHandle` is the contract. Adding new optional fields is fine. Removing or renaming requires a major bump (or a `minor` pre-1.0 with a clear migration note in the changeset).
- The CSS class names (`.link-hints-portal`, `.link-hints-badge`, `.link-hints-badge__typed`, `.link-hints-badge__remaining`) and the documented CSS variables are part of the contract.
- `data-hint` is part of the contract.

### Testing

- **Every behavior change ships with a test.**
- **Tests use `createElement` + helpers, not `innerHTML`.**
- **JSDOM is strict.** `MouseEvent` rejects `view: window`. Tests stub `getBoundingClientRect()` and `document.elementFromPoint`.
- **Each test cleans up** in `beforeEach`.

### Changesets

- **Every PR that changes shipped code adds a `.changeset/*.md` file.**
- `patch` for bug fixes / docs / internal refactors. `minor` for new options or capabilities. `major` only post-1.0 for breaking contract changes.
- Examples and CI config don't need changesets.

### Vimium attribution

- `NOTICE` credits Vimium. **It must stay.**
- New ports add a comment naming the original Vimium symbol (e.g. `// Ported from vimium/lib/dom_utils.js#simulateClick`).

## What goes in `dist/`

```
dist/
├── *.js / *.d.ts          source files compiled by tsc
└── style.css              copied from src/style.css
```

`package.json` `exports`:

```json
{
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./style.css": "./dist/style.css"
}
```

## When in doubt

1. **Read the existing tests.** They document the contract better than any comment.
2. **Check Vimium's source.** [`content_scripts/link_hints.js`](https://github.com/philc/vimium/blob/master/content_scripts/link_hints.js) and [`lib/dom_utils.js`](https://github.com/philc/vimium/blob/master/lib/dom_utils.js) are the references.
3. **Ask before breaking the public API.**

## Useful prompts when editing this repo

- "Add a `nodeFilter` option that lets consumers exclude entire DOM subtrees" → tell the agent which test file to extend, where the filter applies, and to add a Changeset.
- "Port [behavior X] from Vimium" → link to the Vimium source line and ask the agent to add a comment naming the Vimium symbol.
- "Add a [framework] integration recipe" → tell the agent to extend the README's "Framework integration" section. Do not introduce a new package or peer dep — keep the lib framework-free.
