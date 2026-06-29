# Creator-Portal Identity Unification + UX Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify creator-portal onto the canonical SeekKrr brand (green primary / orange CTA / warm neutrals), eliminate slate/indigo fragmentation, and fix reported UX issues (broken selects, chain narratives, 15s→chain suggestion, submission status, wizard friction).

**Architecture:** Token-first. Rewrite design tokens in `src/styles/index.css` + Tailwind `@theme`, restyle the 9 shared UI components against those tokens, gate on a pilot screen, then mechanically migrate every feature onto the system, then fix behavioral flows, then run an adversarial creator↔UX role-play loop.

**Tech Stack:** Vite + React 18 + TS + Tailwind v4, TanStack Query, Zustand, react-hook-form + zod, sonner, react-router v6. Live verification via chrome-devtools MCP on `:9222` (dev server `:5173`).

## Global Constraints

- Scope is `creator-portal/` ONLY. admin-portal / app-frontend / website / backend are read-only reference.
- Do NOT introduce new state libs (keep TanStack Query + Zustand) or new UI frameworks.
- Lint is strict: `npm run lint` must pass with `--max-warnings 0`; `npm run type-check` must pass clean. Run BOTH before every commit.
- Stay on branch `fixes-3-ui`. Frequent, descriptive commits; one per task minimum.
- Brand values (verbatim): primary/brand green `#003634`; orange CTA `#FF5B25`; yellow highlight `#FECD36`; blue info `#8398FF`; beige surface `#FFFFF3`.
- Greyscale: eliminate ALL `slate-*`; converge on warm-tinted `neutral-*`. Eliminate `indigo-*`, `violet-*`, `purple-*`, and `--color-brand-purple`.
- Commit message trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Spec: `docs/superpowers/specs/2026-06-30-creator-portal-ui-unification-design.md`.

---

## File Structure (decomposition)

- `src/styles/index.css` — design tokens + Tailwind `@theme` (Task 1).
- `src/components/ui/*` — 9 shared components restyled (Task 2).
- `src/layouts/*`, `src/features/*/pages|components` — consumers migrated (Tasks 3–4).
- `src/features/narratives/utils/duration.ts` (NEW) — pure duration estimate (Task 8).
- `src/features/narratives/utils/chainFields.ts` (NEW) — pure chain-field resolution (Task 7).
- `src/features/narratives/components/ChainGroupRows.tsx` (NEW) — chain list grouping (Task 6).
- `src/utils/submissionStatus.ts` (NEW, if root cause is frontend) — status decision (Task 9).

---

## Phase A — Foundation

### Task 1: Design tokens + Tailwind wiring

**Files:**
- Modify: `src/styles/index.css` (`:root` token block + add `@theme`)

**Interfaces:**
- Produces: Tailwind utilities `bg-primary-{50..900}`, `text-primary-*`, `bg-accent-{500,600}`, `text-accent-*`, `bg-highlight`, `text-info`, `bg-app`, and warm `neutral-*`. Consumed by every later task.

- [ ] **Step 1: Replace the indigo `--color-primary-*` block** in `src/styles/index.css` with the green scale and add accents; remove `--color-brand-purple`:

```css
  /* Primary — SeekKrr brand green (anchored at #003634) */
  --color-primary-50:  #ecf4f3;
  --color-primary-100: #cfe4e2;
  --color-primary-200: #a3cecb;
  --color-primary-300: #6fb0ab;
  --color-primary-400: #3f8b86;
  --color-primary-500: #1f6f6a;
  --color-primary-600: #0d524e;
  --color-primary-700: #084340;
  --color-primary-800: #053a37;
  --color-primary-900: #003634;

  /* Accent — energetic orange CTA */
  --color-accent-400: #ff7a4d;
  --color-accent-500: #ff5b25;
  --color-accent-600: #e64a17;

  --color-highlight: #fecd36;   /* yellow: rewards, verified, earnings */
  --color-info-accent: #8398ff; /* blue: info chips/links */

  /* Surface */
  --bg-app: #fffff3;            /* warm beige */
```

- [ ] **Step 2: Warm the neutral scale** — replace the existing `--color-neutral-*` values with warm-tinted (stone-leaning) equivalents:

```css
  --color-neutral-50:  #faf9f7;
  --color-neutral-100: #f4f2ee;
  --color-neutral-200: #e7e3dd;
  --color-neutral-300: #d4cfc6;
  --color-neutral-400: #a8a199;
  --color-neutral-500: #78726a;
  --color-neutral-600: #57524b;
  --color-neutral-700: #423e38;
  --color-neutral-800: #292621;
  --color-neutral-900: #1a1714;
```

- [ ] **Step 3: Set app background.** Change `body { background-color: var(--bg-secondary); }` to `var(--bg-app);` and update `--bg-secondary: #fffff3;`.

- [ ] **Step 4: Add a Tailwind v4 `@theme` block** so utilities resolve to these tokens (Tailwind v4 reads `@theme`). After the `@import "tailwindcss";` line add:

```css
@theme {
  --color-primary-50:  #ecf4f3;
  --color-primary-100: #cfe4e2;
  --color-primary-200: #a3cecb;
  --color-primary-300: #6fb0ab;
  --color-primary-400: #3f8b86;
  --color-primary-500: #1f6f6a;
  --color-primary-600: #0d524e;
  --color-primary-700: #084340;
  --color-primary-800: #053a37;
  --color-primary-900: #003634;
  --color-accent-400: #ff7a4d;
  --color-accent-500: #ff5b25;
  --color-accent-600: #e64a17;
  --color-highlight: #fecd36;
  --color-info: #8398ff;
  --color-app: #fffff3;
}
```
(Note: confirm existing Tailwind config approach first — `vite.config.ts`/`@tailwindcss/vite`. If a `tailwind.config` extend is used instead of `@theme`, mirror there. Read before writing.)

- [ ] **Step 5: Verify live.** Reload `:5173` via chrome-devtools, screenshot dashboard. Expected: background warm-beige, no crash. Run `npm run type-check`. Expected: clean.

- [ ] **Step 6: Commit.**
```bash
git add src/styles/index.css
git commit -m "feat(ui): brand design tokens — green primary, orange accent, warm neutrals"
```

### Task 2: Restyle shared UI kit

**Files:**
- Modify: `src/components/ui/Button.tsx`, `Input.tsx`, `Textarea.tsx`, `FloatingInput.tsx`, `Badge.tsx`, `Card.tsx`, `Tooltip.tsx`, `Footer.tsx`, `Skeleton.tsx`

**Interfaces:**
- Produces: `Button` gains `variant="accent"`; `Badge` gains status variants `approved | under_review | changes_requested | rejected | draft | archived`. Consumed by Tasks 3,4,6,10,11.

- [ ] **Step 1: Button** — set `primary` → `bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500`; add `accent` variant → `bg-accent-500 hover:bg-accent-600 text-white focus-visible:ring-accent-500`; make ALL variants use `focus-visible:ring-2 focus-visible:ring-offset-2`. Replace any `indigo-*` with `primary-*`.

- [ ] **Step 2: Input + Textarea** — change focus to `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 focus:border-primary-500`; replace `indigo-*`→`primary-*`. Keep error red.

- [ ] **Step 3: FloatingInput** — replace every `slate-*` with `neutral-*`; focused border `border-primary-600`, focused label `text-primary-700`; adopt the shared focus ring.

- [ ] **Step 4: Badge** — add a `status` prop or extend `variant` union with the six statuses, each `bg-*-100 text-*-700 border border-*-200` (approved=emerald, under_review=amber, changes_requested=orange, rejected=red, draft=neutral, archived=neutral-muted). Keep existing semantic variants but point `primary` at green.

- [ ] **Step 5: Card / Tooltip / Skeleton** — Card: confirm `rounded-xl`, `indigo`→`primary`. Tooltip/InfoHint: `slate-*`→`neutral-*`. Skeleton: `bg-neutral-200` already fine.

- [ ] **Step 6: Footer** — keep social brand hex but lift them into named constants at top of file (`const SOCIAL = { whatsapp: "#25D366", ... }`); links `text-neutral-600 hover:text-neutral-900`; unify transition `duration-200`.

- [ ] **Step 7: Verify.** `npm run lint && npm run type-check`. Screenshot a screen using each component (login for inputs, quests for badges). Expected: green/orange render, no slate.

- [ ] **Step 8: Commit.**
```bash
git add src/components/ui
git commit -m "feat(ui): restyle shared kit on brand tokens; add accent button + status badges"
```

### Task 3: Pilot screens + APPROVAL GATE

**Files:**
- Modify: `src/layouts/DashboardLayout.tsx`, `src/features/dashboard/pages/DashboardPage.tsx` (+ `StackedHeroCards`), `src/features/quest/pages/QuestsPage.tsx`

- [ ] **Step 1:** Migrate these three surfaces fully: `slate-*`→`neutral-*`, `indigo/violet/purple`→`primary`/`accent`, hero "Create Quest" → `accent` button, active stepper/tab states → `primary`, status badges → new Badge variants, normalize radii per rule.
- [ ] **Step 2:** `npm run lint && npm run type-check` clean.
- [ ] **Step 3:** Screenshot dashboard + quests list (full page) on `:9222`.
- [ ] **Step 4: GATE** — present screenshots to the user; get explicit sign-off on the look before Phase B. Adjust tokens/components if requested (loop back to Task 1/2).
- [ ] **Step 5: Commit.**
```bash
git add src/layouts/DashboardLayout.tsx src/features/dashboard src/features/quest/pages/QuestsPage.tsx
git commit -m "feat(ui): migrate dashboard + quests list to brand system (pilot)"
```

---

## Phase B — Mass Migration

### Task 4: Migrate remaining features + layouts

**Files (migrate each, one commit per logical group):**
- `src/layouts/AuthLayout.tsx`, `PublicLayout.tsx`
- `src/features/auth/pages/*` (incl. LoginPage `#F5F3FF`→`bg-primary-50`, remove `text-brand-purple`)
- `src/features/profile/pages/ProfilePage.tsx` (violet seal → primary/highlight)
- `src/features/markers/**`, `narratives/**`, `tasks/**`, `payoutAccounts/**`, `contact/**`, `legal/**`
- `src/features/quest/components/*` (remaining steps: LocationStep, DetailsStep, WaypointsStep, WaypointDetailsStep, ReviewStep, RegionSearchSelect)
- `src/features/map/**` (POI hex → token map), `src/utils/status.ts`, `src/components/*` (MapboxLocationSearch, VideoWalkthroughModal, etc.)

**Color mapping (mechanical):** `slate-N`→`neutral-N`; `indigo-N`→`primary-N`; `violet-*`/`purple-*`→`primary-*` (or `accent` for CTAs); raw `#F5F3FF`→`primary-50`; focus `ring-indigo-*/20`→`ring-primary-500`.

- [ ] **Step 1:** For each group, grep the files for `slate-|indigo-|violet-|purple-|brand-purple|#F5F3FF`, apply the mapping, normalize radii, swap hero CTAs to `accent`, swap ad-hoc status badges to Badge variants.
- [ ] **Step 2:** After each group: `npm run lint && npm run type-check`; screenshot the affected page(s) on `:9222`.
- [ ] **Step 3:** Commit per group, e.g. `git commit -m "refactor(ui): migrate markers to brand system"`.
- [ ] **Step 4: Final sweep verification** — grep MUST return zero:
```bash
grep -rEn "slate-|indigo-|violet-|purple-|brand-purple" src/ | grep -v node_modules
```
Expected: no output. (Footer social hex are allowed named constants.)
- [ ] **Step 5: Commit** any cleanup.

---

## Phase C — Flow Fixes

### Task 5: Fix select/dropdown defect

**Files:** Modify each custom select component. Suspects (verify each live first): `src/features/markers/components/MarkerRegionSelect.tsx`, narrative attach selector in `NarrativeFormModal.tsx`, theme multi-select in `src/features/quest/components/DetailsStep.tsx`, action/kebab menus in `QuestsPage.tsx`/`MarkersPage.tsx`/`NarrativesPage.tsx`. Reference correct pattern: `RegionSearchSelect.tsx`.

- [ ] **Step 1: Reproduce** each on `:9222` (type/select, observe if dropdown stays open / field+list both render). Record which are broken.
- [ ] **Step 2:** For each broken one, on selection: set value → close list (`setOpen(false)`) → blur/commit; add outside-click close (mousedown listener on document) + `Escape` close; for single-select, collapse to selected display (chip or filled input). For multi-select, keep open but reflect chips and stop duplicating the raw input field.
- [ ] **Step 3: Verify** each on `:9222`: after selection the dropdown closes and the field shows the chosen value.
- [ ] **Step 4:** `npm run lint && npm run type-check`. Commit `fix(ui): selects collapse/close on selection`.

### Task 6: Chain-narrative types + list grouping

**Files:**
- Modify: `src/types/index.ts` (type `NarrativeAttachSummary`; add `NarrativeChainSummary`, `NarrativeStandaloneSummary` — mirror admin-portal `src/types/index.ts:810-846`)
- Create: `src/features/narratives/components/ChainGroupRows.tsx`
- Modify: `src/features/narratives/pages/NarrativesPage.tsx`

**Interfaces:**
- Produces: `NarrativeChainSummary { chain_id; label; first_narrative_id; count; max_sequence_order; next_sequence_order }`; `ChainGroupRows` props `{ chainId: string; label: string; members: Narrative[] }`.

- [ ] **Step 1:** Add the typed interfaces (replace the `[key: string]: unknown` catch-all on `NarrativeAttachSummary`).
- [ ] **Step 2:** Implement `groupByChain(narratives): { chains: {chain_id,label,members}[]; loose: Narrative[] }` in `NarrativesPage` — only chains with >1 member group; lone members fall to loose; members sorted by `sequence_order`.
- [ ] **Step 3:** `ChainGroupRows` — collapsible header `🔗 Chain of N — {label}`, indented member rows with `#sequence_order` Badge; reuse existing row markup. Loose rows with `chain_id` show a chain-link icon.
- [ ] **Step 4: Verify** on `:9222` (seed a chain via API/admin if none exists, or assert grouping with mocked data). `npm run lint && npm run type-check`.
- [ ] **Step 5:** Commit `feat(narratives): chain grouping on list (ChainGroupRows)`.

### Task 7: NarrativeFormModal — attach-summary + chain fields

**Files:**
- Create: `src/features/narratives/utils/chainFields.ts`
- Modify: `src/features/narratives/components/NarrativeFormModal.tsx`, `src/features/narratives/schemas/narrative.schema.ts`

**Interfaces:**
- Produces: `chainFieldsFromSummary(summary): { chain_id?, sequence_order?, chain_with? }`.

- [ ] **Step 1: Write failing test** `src/features/narratives/utils/chainFields.test.ts`:
```ts
import { chainFieldsFromSummary } from "./chainFields";
test("existing chain → chain_id + next sequence", () => {
  expect(chainFieldsFromSummary({ chains:[{chain_id:"c1",next_sequence_order:3}], standalone:[] } as any))
    .toEqual({ chain_id:"c1", sequence_order:3 });
});
test("standalone only → chain_with", () => {
  expect(chainFieldsFromSummary({ chains:[], standalone:[{ id:"n1" }] } as any))
    .toEqual({ chain_with:"n1" });
});
test("empty → {}", () => {
  expect(chainFieldsFromSummary({ chains:[], standalone:[] } as any)).toEqual({});
});
```
- [ ] **Step 2:** Run `npm test -- chainFields` → FAIL.
- [ ] **Step 3:** Implement `chainFields.ts` to satisfy (mirror admin-portal `CreateNarrativeModal` lines 67–83).
- [ ] **Step 4:** Run test → PASS.
- [ ] **Step 5:** Wire into modal: on attach target select, `useQuery(getAttachSummary(type,id))`; if `has_conflict` show a notice ("Will be added as part #N of '{label}'" / "Will be chained after '{title}'") + an "Edit existing instead" link to the first narrative; on submit, merge `chainFieldsFromSummary(summary)` into create payload; strip chain fields from update payload. On 409, re-fetch summary and retry.
- [ ] **Step 6: Verify** create-narrative on an attach target that already has a narrative → notice appears, new one chains. `npm run lint && npm run type-check`.
- [ ] **Step 7:** Commit `feat(narratives): attach-summary conflict pre-check + chain fields`.

### Task 8: Narrative duration meter → chain suggestion

**Files:**
- Create: `src/features/narratives/utils/duration.ts`
- Modify: `src/features/narratives/components/NarrativeFormModal.tsx`

**Interfaces:**
- Produces: `WORDS_PER_SECOND = 2.5`, `MAX_SEGMENT_SECONDS = 15`, `estimateSeconds(text): number`, `exceedsSegment(text): boolean`.

- [ ] **Step 1: Write failing test** `duration.test.ts`:
```ts
import { estimateSeconds, exceedsSegment, MAX_SEGMENT_SECONDS } from "./duration";
test("38 words ≈ 15s", () => { expect(Math.round(estimateSeconds("word ".repeat(38)))).toBe(15); });
test("empty → 0", () => { expect(estimateSeconds("")).toBe(0); });
test("exceeds at >15s", () => { expect(exceedsSegment("word ".repeat(50))).toBe(true); });
test("not exceed at <15s", () => { expect(exceedsSegment("word ".repeat(10))).toBe(false); });
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: `estimateSeconds = wordCount / WORDS_PER_SECOND` (wordCount = trimmed split on `/\s+/`, empty→0); `exceedsSegment = estimateSeconds(text) > MAX_SEGMENT_SECONDS`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** In the modal, under the content textarea render a live meter `~{Math.round(estimateSeconds(content))}s / 15s` with color ramp (neutral <11s, amber 11–15s, orange >15s). When `exceedsSegment`, render a notice steering to split into a chain (uses the chain machinery from Task 7) and, when adding to a chain, show previous segments in sequence (from `getAttachSummary`/`getByChain`).
- [ ] **Step 6: Verify** on `:9222`: type >38 words → meter turns orange, chain suggestion appears. `npm run lint && npm run type-check`.
- [ ] **Step 7:** Commit `feat(narratives): 15s duration meter + chain split suggestion`.

### Task 9: Submission status (draft → under_review)

**Files:** Diagnose first. Likely Modify: `src/services/narrative.service.ts`, `src/features/quest/pages/CreateQuestPage.tsx`, marker submit path, task submit path. Possibly Create: `src/utils/submissionStatus.ts`.

- [ ] **Step 1: Diagnose (read-only).** For each artifact, trace the "Submit for Review" action → what status/endpoint it sends. Compare to backend v2 submit semantics (`backend/v2/api/routes/*` — read only). Determine whether frontend sends `draft` / calls the wrong endpoint, or backend defaults to draft. **Report findings before editing.**
- [ ] **Step 2: Define intended decision** (where frontend owns it): submit → `under_review`; explicit "Save as Draft" → `draft`. If a verified vs unverified branch is needed, encode: unverified creators may default to draft staging but still reach `under_review` on explicit submit. If a pure helper is warranted, add `submissionStatus.ts` with a small unit test mirroring Task 7/8 TDD shape.
- [ ] **Step 3: Fix at the correct layer** for narrative, marker, task, quest.
- [ ] **Step 4: Verify** on `:9222`: submit each artifact → status becomes `under_review`; Save-as-Draft → `draft`. `npm run lint && npm run type-check`.
- [ ] **Step 5:** Commit `fix(submission): submit yields under_review; draft only via save-as-draft`.

### Task 10: Quest wizard friction

**Files:** Modify `src/features/quest/pages/CreateQuestPage.tsx`, `LocationStep.tsx`, `DetailsStep.tsx`, `WaypointsStep.tsx`.

- [ ] **Step 1:** Add a draft "Saving…/Saved" indicator tied to the sessionStorage persistence (CreateQuestPage ~line 177–180).
- [ ] **Step 2:** Add loading states on region resolve (`Next` in step 1) and reverse-geocode (current-location) so the UI isn't visually frozen.
- [ ] **Step 3:** Empty-state guidance on the Markers step when no markers (min 2 enforced).
- [ ] **Step 4:** Clear selected styling for theme multi-select (check icon / `bg-primary-50 border-primary-500`).
- [ ] **Step 5:** Inline hint that quest-narrative editing happens in Narratives.
- [ ] **Step 6: Verify** on `:9222`; `npm run lint && npm run type-check`. Commit `feat(quest): wizard friction — save indicator, loading states, multi-select feedback`.

### Task 11: Empty / loading / error states

**Files:** Modify list pages: `QuestsPage`, `MarkersPage`, `NarrativesPage`, `TasksPage`, `PayoutAccountsPage`.

- [ ] **Step 1:** Standardize an empty-state block (icon + title + subtext + prominent `accent`/`primary` CTA) and apply to each list when zero items; consistent skeleton loaders (use `Skeleton`); consistent error state with retry.
- [ ] **Step 2: Verify** each empty state on `:9222` (filter to an empty tab). `npm run lint && npm run type-check`.
- [ ] **Step 3:** Commit `feat(ui): consistent empty/loading/error states across list pages`.

---

## Phase D — Role-Play Friction Loop

### Task 12: Creator ↔ Senior-UX adversarial loop (cap ~4 rounds)

- [ ] **Step 1:** Dispatch a **Creator agent** (subagent) with chrome-devtools access: act as a real creator attempting end-to-end jobs (sign-in state already live; create a quest, create a marker, write a narrative incl. a long one, submit each, browse lists). Report friction as a ranked JSON list (severity high/medium/low, screen, repro, expected).
- [ ] **Step 2:** Dispatch a **Senior UI/UX agent** to fix the high/medium items found (editing real files, verifying live, respecting all Global Constraints).
- [ ] **Step 3:** `npm run lint && npm run type-check`; commit the round (`fix(ux): role-play round N`).
- [ ] **Step 4:** Repeat Steps 1–3 until the Creator agent reports no high/medium friction OR 4 rounds reached. Log what was dropped if capped.
- [ ] **Step 5:** Final verification sweep + summary to user.

---

## Self-Review (completed)

- **Spec coverage:** tokens(T1) · kit(T2) · pilot gate(T3) · migration+grep-zero(T4) · selects(T5) · chain types/list(T6) · attach-summary/chain fields(T7) · 15s meter(T8) · submission status(T9) · wizard friction(T10) · empty states(T11) · role-play loop(T12). All spec sections mapped.
- **Placeholders:** none — token values, mappings, and test code are concrete; the one investigate-first task (T9) explicitly defers code until root cause is reported, by design.
- **Type consistency:** `chainFieldsFromSummary`, `estimateSeconds/exceedsSegment`, `NarrativeChainSummary`, `ChainGroupRows` props referenced consistently across T6–T8.
