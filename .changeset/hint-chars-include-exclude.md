---
'@sannagroup/link-hints': minor
---

`hintChars` now accepts `{ include: string }` or `{ exclude: string }` in
addition to a plain string. `{ include: 'xy' }` adds to the default set;
`{ exclude: 's' }` drops characters from it (useful when your app already
binds `s` to its own shortcut). Passing a plain string still replaces the
default set outright.
