---
'@sannagroup/link-hints': minor
---

Allow multiple elements to share the same `data-hint` value. Previously, two elements with `data-hint="S"` threw `duplicate pinned hint "S"`. They are now auto-numbered in document order — `S1`, `S2`, `S3`, … — so list rows that share a mnemonic can be picked by typing the prefix followed by a digit. A `data-hint` value used by exactly one element is unchanged (no suffix). Auto-assigned labels remain alphabetic-only; digits only ever appear as a suffix on a user-supplied `data-hint`. The keydown handler now also accepts `0-9` so the digit suffix can be typed.
