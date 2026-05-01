---
'@sannagroup/link-hints': patch
---

Internal: extract `isEditableElement` / `isTextEntryInput` / `isContentEditable` into `src/utils/editable.ts` and share between `link-hints.ts` and `click-simulator.ts`, removing the duplicated `TEXT_INPUT_TYPES_TO_IGNORE` constant. The `isContentEditable` helper now also accepts an explicit `contentEditable="true"` attribute, fixing a latent case where `HTMLElement.isContentEditable` was not reflected by the live getter. Adds util test coverage to 100% statements/lines (click-simulator and emitter were previously untested). No public API change.
