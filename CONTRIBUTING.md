# Contributing

Thanks for your interest! `link-hints` is small and intentionally narrow in scope — keyboard-driven click-by-label, ported from Vimium. Bug fixes, docs, and well-scoped feature additions are all welcome.

This file covers **how to develop, test, and release** the package. For deeper architectural and stylistic guidance, see [`AGENTS.md`](./AGENTS.md).

## Table of contents

- [Setup](#setup)
- [Local development](#local-development)
- [Making a change](#making-a-change)
- [Adding a changeset](#adding-a-changeset)
- [Pull requests](#pull-requests)
- [Code style](#code-style)
- [Testing](#testing)
- [Release process](#release-process)
- [Troubleshooting](#troubleshooting)

## Setup

You need [Bun](https://bun.sh) `>= 1.3`. Everything else (TypeScript, Vitest, Prettier, Changesets) installs from `package.json`.

```bash
git clone git@github.com:sannagroup/link-hints.git
cd link-hints
bun install
```

The repo publishes a single package, `@sannagroup/link-hints`, from the root. `examples/vanilla` is a separate, private demo that depends on the lib via `file:../..` and has its own `node_modules`.

## Local development

```bash
# Run the test suite once
bun run test

# Type-check
bun run typecheck

# Build the dist/
bun run build

# Format code (writes changes)
bun run format

# Check formatting (no writes — same thing CI runs)
bun run lint

# Run the vanilla example at http://localhost:5173
bun --cwd examples/vanilla install   # one-time
bun --cwd examples/vanilla dev
```

If you're iterating, the fastest loop is `bun x vitest` (watch mode by default) from the repo root.

## Making a change

1. **Branch off `main`.** Use a short descriptive prefix:
   ```bash
   git checkout -b fix/menu-trigger-detection
   ```
2. **Make your change** in `src/`. Add or update tests in `tests/`.
3. **Run the full check locally** before pushing:
   ```bash
   bun run typecheck
   bun run test
   bun run lint
   ```
4. **Add a changeset** (see next section).
5. **Commit and push.** Open a PR against `main`.

### What kind of change needs a changeset?

| Change                                               | Changeset? | Bump                         |
| ---------------------------------------------------- | ---------- | ---------------------------- |
| Bug fix in shipped code                              | yes        | `patch`                      |
| New optional API field                               | yes        | `minor`                      |
| Breaking change to API / CSS / `data-hint` semantics | yes        | `major` (or `minor` pre-1.0) |
| Internal refactor with no observable change          | yes        | `patch`                      |
| Doc-only change                                      | yes        | `patch`                      |
| CI / tooling / dev-dep update                        | no         | —                            |
| Example app change                                   | no         | —                            |
| Test-only change                                     | no         | —                            |

Pre-1.0 (where we are now), Changesets convention is to use `minor` for breaking changes too. Don't worry about `major` until we hit 1.0.

## Adding a changeset

Run interactively:

```bash
bun changeset
```

It'll ask:

1. **Which packages?** Press `<space>` on `@sannagroup/link-hints`, then `<enter>`.
2. **Bump type?** Pick `patch` / `minor` / `major` per the table above.
3. **Summary?** A one- or two-sentence note that'll appear in `CHANGELOG.md`. Write it from the user's perspective ("Fixes click on Radix dropdowns" not "Refactor performTargetAction").

This creates a file like `.changeset/witty-cats-jump.md`. Commit it with the rest of your change.

## Pull requests

- Title: short, imperative, present tense (`fix: …`, `feat: …`, `docs: …`).
- Description: what changed, why, and any caveats.
- The PR must pass CI (lint + typecheck + test + build). All checks run on `pull_request`.
- A reviewer (or you, if you're a maintainer) merges via squash. The merge message becomes the commit on `main`.

## Code style

Short version (full rules in [`AGENTS.md`](./AGENTS.md)):

- Prettier formats. Run `bun run format` before pushing.
- Strict TypeScript. Don't relax compiler flags.
- Arrow function expressions, not declarations.
- Explicit return types on exported functions.
- No abbreviations (`element`, not `el`; `event`, not `e`; `organization`, not `org`).
- Comment the _why_, not the _what_. Names should explain the _what_.
- No comments that just restate the code.

## Testing

- Tests use Vitest with JSDOM.
- Build DOM with `document.createElement` + helpers, never `innerHTML` (XSS hygiene + reliability).
- Stub `getBoundingClientRect()` and `document.elementFromPoint` — JSDOM doesn't lay out real geometry.
- Don't pass `view: window` to `MouseEvent` — JSDOM rejects it.
- Each test cleans up in `beforeEach` (clear `document.body`, reset stubs).

The existing tests in `tests/` are the best reference. Copy a similar test as a starting point.

## Release process

### How the pipeline works

We use [Changesets](https://github.com/changesets/changesets) + GitHub Actions. The flow:

```
You push a PR with a `.changeset/*.md`
       │
       ▼
PR merges to main
       │
       ▼
release.yml workflow runs
       │
       ├── Sees pending changesets
       │   └── Opens (or updates) a PR titled "chore: version packages"
       │       This PR bumps version, writes CHANGELOG, deletes the changesets.
       │
       └── (or) Sees no pending changesets
           └── Sees the version PR was just merged → publishes to npm
```

So a release is a **two-merge dance**:

1. Merge a feature/fix PR (containing a changeset)
2. Wait for the bot to open the "chore: version packages" PR
3. Review and merge that PR
4. The workflow runs again on the version-PR merge and **this** time it publishes to npm

### Releasing for real (after the first publish works)

You don't have to do anything beyond merging PRs. The bot handles it. Just:

1. Make sure your PR has a changeset.
2. Merge to `main`.
3. Wait a minute, then check for the bot's "Version Packages" PR at https://github.com/sannagroup/link-hints/pulls
4. Review (mostly the auto-generated `CHANGELOG.md` entry).
5. Merge it.
6. Watch the workflow at https://github.com/sannagroup/link-hints/actions until the publish step is green.
7. Verify on npm: `npm view @sannagroup/link-hints`.

### First-time release setup (one-time)

Two things have to be in place before the very first publish can succeed:

#### 1. `NPM_TOKEN` secret in the repo

The release workflow uses `NPM_TOKEN` to publish. Generate one and add it:

```
1. https://www.npmjs.com/settings/~/tokens
2. Generate New Token → Classic Token → "Automation"
   (Classic Automation tokens inherit your full publish permissions.
    Granular tokens default to "your packages only" and need
    @sannagroup explicitly added under "Packages and scopes".)
3. Copy the token (you won't see it again).
4. Go to https://github.com/sannagroup/link-hints/settings/secrets/actions
5. New repository secret. Name: NPM_TOKEN. Paste the token. Add.
```

Verify the user behind the token is a member of the `sannagroup` npm org with publish rights:

```
https://www.npmjs.com/settings/sannagroup/members
```

#### 2. GitHub Actions workflow permissions

The release workflow needs to push commits and open PRs.

```
https://github.com/organizations/sannagroup/settings/actions

→ "Workflow permissions"
   ◉ Read and write permissions
   ☑ Allow GitHub Actions to create and approve pull requests
→ Save
```

Then in the repo settings (which inherits from the org):

```
https://github.com/sannagroup/link-hints/settings/actions
→ same toggles, "Read and write" + the create-PR checkbox
```

#### 3. Manually trigger the first release

After the secret + permissions are set, push any commit (or dispatch manually):

```bash
gh workflow run release.yml --repo sannagroup/link-hints
```

Watch it land:

```bash
gh run list --repo sannagroup/link-hints --workflow=release.yml --limit 1
gh run watch --repo sannagroup/link-hints
```

If it succeeds, the bot opens a Version PR. Merge it; the next workflow run publishes.

## Troubleshooting

**`bun install` fails with "Unknown lockfile version".** CI uses a specific Bun version (see `.github/workflows/*.yml`). Bump your local Bun to match (`bun upgrade`) or update the workflows.

**`bun run lint` fails with formatting issues.** Run `bun run format` to write the fixes.

**Tests pass locally but fail in CI.** Most likely a `window` / `document` access that works in your locally-cached JSDOM but not in a fresh one. Tests should always set up their own stubs in `beforeEach`.

**Release workflow fails with `404 Not Found` on `npm publish`.** The `NPM_TOKEN` doesn't have write permission to the `@sannagroup` scope. Regenerate as a Classic Automation token, or add `@sannagroup` to the granular token's scope list. Update the repo secret and re-run the workflow.

**Release workflow fails with `Resource not accessible by integration` when opening a PR.** GitHub Actions doesn't have permission to create PRs. Fix at the org level (Settings → Actions → "Allow GitHub Actions to create and approve pull requests").

**Changesets validation error: "package not found in project".** The `ignore` list in `.changeset/config.json` references a package that no longer exists. Remove it.

## Code of Conduct

Be kind. We follow the spirit of the [Contributor Covenant](https://www.contributor-covenant.org/). If something feels off, open an issue or email `deep@fiksferdigregnskap.no`.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).
