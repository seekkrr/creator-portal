# Creator-Portal — Identity Unification + UX Cleanup

**Date:** 2026-06-30
**Branch:** `fixes-3-ui`
**Scope:** `creator-portal/` only (do not touch admin-portal, app-frontend, backend except read-only reference)
**Mode:** Visual identity unification + UX-flow fixes

---

## 1. Problem Statement

The creator-portal is structurally sound (Vite + React 18 + TS + Tailwind v4, TanStack Query + Zustand, feature-sliced) but **visually fragmented**:

- **Grayscale collision:** `slate-*` (≈344 uses) and `neutral-*` (≈282 uses) used interchangeably across ~60 files, sometimes within one component.
- **Off-brand accent:** de-facto primary is generic indigo `#4f46e5`, plus a stray purple gradient (`Use My Current Location`), a `violet` verification seal, and an orphan `--color-brand-purple: #2D0F35` token. None match the green logo or the canonical SeekKrr brand.
- **Component drift:** inconsistent focus-ring offsets (Button `ring-offset-2`, Input `ring-offset-0`, FloatingInput none), no `rounded-xl` vs `rounded-2xl` rule, status badges re-implemented ad-hoc per page, hardcoded hex (footer socials, login bg, map POI).
- **UX friction:** broken custom selects (stay open / keep showing field after selection), missing chain-narrative UI, quest-wizard friction (no save indicator, no loading states, weak multi-select feedback), thin empty/loading/error states.

## 2. Canonical Brand (source of truth)

Derived from `website/styles/globals.css` (the marketing site):

| Token | Hex | Role |
|---|---|---|
| `green-dark` | `#003634` | **Primary / brand anchor** (matches logo) |
| `orange-accent` | `#FF5B25` | **Energy / hero CTA** |
| `yellow-accent` | `#FECD36` | Reward / highlight (verified, earnings) |
| `blue-accent` | `#8398FF` | Info / secondary |
| `beige` | `#FFFFF3` | Warm app background |

## 3. Decisions (locked with user)

1. **Direction:** Refresh & unify identity around the canonical brand.
2. **Scope of change:** Visual + UX flow (not visual-only).
3. **Consistency boundary:** creator-portal only.
4. **Primary accent strategy:** **Green primary, orange CTA** — deep green `#003634` anchors nav/headings/most buttons/active states; vivid orange `#FF5B25` reserved for hero CTAs (Create Quest, Submit for Review) and key highlights.
5. **Greyscale:** Converge on a single scale and **eliminate `slate-*`**; **warm-tinted neutrals** (shift slightly toward the beige surface so greys harmonize).
6. **Role-play loop:** cap at ~3–4 rounds or until no high/medium-severity friction remains.

## 4. Design System

### 4.1 Tokens (`src/styles/index.css`)
Replace indigo `--color-primary-*` with a green tonal scale anchored at `#003634`:

```
--color-primary-50:  #ecf4f3
--color-primary-100: #cfe4e2
--color-primary-200: #a3cecb
--color-primary-300: #6fb0ab
--color-primary-400: #3f8b86
--color-primary-500: #1f6f6a   /* interactive */
--color-primary-600: #0d524e   /* primary button bg */
--color-primary-700: #084340
--color-primary-800: #053a37
--color-primary-900: #003634   /* brand anchor, headings */
```
Add:
```
--color-accent-500: #FF5B25 ; --color-accent-600: #e64a17   /* orange CTA */
--color-highlight:  #FECD36                                  /* yellow */
--color-info-accent:#8398FF                                  /* blue */
--bg-app:           #FFFFF3                                   /* beige */
```
Warm-tint the neutral scale slightly (stone-leaning) so greys sit on beige cleanly. Remove `--color-brand-purple`.

Wire these into Tailwind v4 (`@theme`) so `bg-primary-600`, `text-primary-900`, `bg-accent-500`, `bg-app`, etc. resolve to brand values. `body` background → `--bg-app`.

### 4.2 Component standards (`src/components/ui/`)
- **Focus ring (all interactive):** `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500`.
- **Radius rule:** inputs/buttons `rounded-lg`; cards `rounded-xl`; `rounded-2xl` only for hero/feature surfaces.
- **Button:** primary = `bg-primary-600 hover:bg-primary-700`; add `accent` variant = `bg-accent-500 hover:bg-accent-600` for hero CTAs; all variants use brand focus ring.
- **Badge:** add canonical `status` variants (approved / under_review / changes_requested / rejected / draft / archived) with the border treatment currently duplicated on Quests/Markers pages. Pages consume these instead of re-implementing.
- **FloatingInput:** migrate `slate-*` → warm neutral; adopt shared focus ring.
- **Input / Textarea:** unify focus ring offset with Button.
- **Footer / map POI / login bg:** hardcoded hex → tokens (social brand colors may stay as named hex constants but centralized).

### 4.3 Migration
slate→neutral and indigo/purple/violet→brand across ~40–50 files, page by page, verified live on `:9222`.

## 5. UX-Flow Fixes

### 5.1 Select/dropdown defect
Audit every custom select for the "stays open / keeps showing field + dropdown after selection" bug. Reference correct pattern: `RegionSearchSelect` (collapses to chip + "Change", outside-click close). Suspects to verify: `MarkerRegionSelect`, narrative attach selector, theme multi-select (`DetailsStep`), action/kebab menus (Quests/Markers/Narratives). Fix each to: commit selection → collapse/close → reflect value → support outside-click + Escape.

### 5.2 Chain narratives (parity with admin-portal)
Types/service/routes already exist in creator-portal; this is UI wiring:
- **Types** (`src/types/index.ts`): properly type `NarrativeAttachSummary` (`active_count`, `has_conflict`, `is_chain`, `chains[]`, `standalone[]`); add `NarrativeChainSummary`, `NarrativeStandaloneSummary` (mirror admin-portal lines 810–846).
- **`NarrativesPage`:** `groupByChain()` + new `ChainGroupRows` component — collapsible "Chain of N" header, members sorted by `sequence_order`, `#n` badges; standalone rows unchanged. Chain link icon on chained rows.
- **`NarrativeFormModal`:** on target select, call `getAttachSummary()`; show conflict/chain notice; compute chain fields (`chainFieldsFromSummary`): existing chain → `{chain_id, sequence_order: next}`, standalone → `{chain_with}`, else standalone. Defensive 409 re-fetch. Strip chain fields from update payload.
- **Service/routes/config:** already present (`getByChain`, `getAttachSummary`, `BY_CHAIN`, `ATTACH_SUMMARY`) — no changes.

### 5.3 Narrative duration → auto-suggest chain
**Reasoning:** narration/TTS pace ≈ 150 wpm = **2.5 words/sec**. Threshold **15 s ≈ 38 words (~225 chars)**. Constants: `WORDS_PER_SECOND = 2.5`, `MAX_SEGMENT_SECONDS = 15` (tunable, colocated).
- **Live meter** under the narrative content field: estimated seconds = `wordCount / WORDS_PER_SECOND`, shown as `~Xs / 15s`, color ramps neutral → amber → orange as it approaches/exceeds 15 s.
- **On exceed:** visual feedback banner steering the creator to split into a **chain** ("This is ~18s of audio. Narratives over 15s play better as a chain — split into segments?"). Splitting links segments via `chain_id`/`sequence_order` using the existing attach-summary/chain machinery.
- **Chain context:** when adding/splitting into a chain, the form shows the **previous segments in sequence** (from `getAttachSummary` / `getByChain`) so the creator writes continuations with context.

### 5.4 Quest wizard friction
- Draft auto-save "Saving…/Saved" indicator (sessionStorage persistence is invisible today).
- Loading states on region resolve + reverse-geocode (currently appears frozen).
- Empty-state guidance on the Markers step (min 2 markers).
- Clear selection feedback for theme multi-select (check/active styling).
- Inline hint that quest-narrative editing happens in the Narratives section.

### 5.5 Empty / loading / error states
Consistent, illustrated empty states with a prominent CTA across all list pages (Quests, Markers, Narratives, Tasks, Payouts).

### 5.6 Submission status bug
**Reported:** submitting a narrative (and likewise markers, tasks, quests) lands it in `draft` when it should become `under_review`.

**Intended behavior:**
- "Submit for Review" on any artifact (narrative / marker / task / quest) → status `under_review`.
- `draft` is only the outcome of an explicit "Save as Draft" action — and is the sensible default surface for **unverified** creators who want to stage work before submitting.
- Verified creators submitting should never silently land in `draft`.

**Approach:** This is a behavioral fix — before changing anything, confirm root cause via systematic debugging (is the frontend sending the wrong status / calling the wrong endpoint, or is the backend submit endpoint defaulting to draft?). Check each artifact's submit path: narrative (`narrative.service` submit + `NarrativeFormModal`/detail submit), quest (`CreateQuestPage` submit-for-review vs save-draft, lines ~345–354), marker submit, task submit. Verify against backend v2 status semantics (read-only). Fix at the correct layer; do not assume frontend.

## 6. Execution Plan & Phasing

- **Phase A — Foundation:** tokens + Tailwind wiring + restyle 9 shared UI components. **Pilot gate:** restyle Dashboard + one list page, screenshot live on `:9222`, get user sign-off on the *look* before mass rollout.
- **Phase B — Migration:** slate→neutral + indigo→brand across all features + 3 layouts, verified live.
- **Phase C — Flow fixes:** selects (5.1), chain narratives (5.2), duration→chain (5.3), wizard friction (5.4), empty states (5.5), submission status (5.6).
- **Phase D — Role-play loop:** Creator agent (drives flows on `:9222`, reports ranked friction) ↔ Senior UI/UX agent (fixes); loop until no high/medium friction or ~4 rounds. Commit between rounds.

**Git:** stay on `fixes-3-ui`; commit per phase with descriptive messages; **before every commit** run `npm run lint` (`--max-warnings 0`) and `npm run type-check`.

## 7. Out of Scope
- admin-portal, app-frontend, website, backend changes (read-only reference only).
- New state-management libs (keep TanStack Query + Zustand).
- Backend narrative/chain endpoints (already exist).
- Dark mode.

## 8. Success Criteria
- Zero `slate-*` and zero `indigo/violet/purple` usages remain (grep-verifiable); single warm-neutral + brand-green/orange system.
- All shared components share one focus ring + radius rule; Badge status variants consumed everywhere.
- Reported bugs fixed: selects collapse/close on selection; chain-narrative view+create works; narrative duration meter + chain suggestion live; submitting any artifact yields `under_review` (draft only via explicit Save-as-Draft).
- `npm run lint` and `npm run type-check` pass clean.
- Role-play loop terminates with no high/medium friction outstanding.
