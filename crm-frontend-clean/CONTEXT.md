# Current Context

## Date

- 2026-03-31

## Working Goal

- Upgrade the current frontend CRM concepts toward a more credible overseas industrial B2B SaaS UI/UE baseline.
- Keep design work grounded in the project's real structure instead of inventing a disconnected product architecture.
- Use local concept pages first, then decide later whether to push updates into Figma.

## Current Menu Baseline

- Customers
- Accounts
- Pipeline
- Activities
- Reports

## Completed This Round

- Reworked shared concept styles in `src/concepts/customerConceptStyles.css`.
- Updated `Customers`, `Accounts`, and `Pipeline` concept pages to fix the latest layout and interaction issues raised by the user.
- Replaced persistent right-side list previews with drawer-style overlay previews.
- Reduced the size and spacing of the compact KPI strip so the main list or board remains dominant.
- Split list controls into:
  - command row
  - filter row
  - active-filter summary row
- Rebuilt detail-page left rails so actions, compact metrics, and metadata are no longer crowded together.
- Expanded detail-page primary and secondary action coverage beyond simple edit/delete.
- Added more realistic center-rail operational content for each object type.
- Strengthened long-value handling and custom-field overflow behavior in the concepts.
- Tightened action affordance rules so buttons, tags, labels, links, and passive values are easier to distinguish.
- Added contextual `⋯` overflow actions to local preview/detail sections instead of exposing every action as a white button.
- Removed the detail-page sticky-card feel by making the side panels scroll naturally instead of pinning multiple cards.
- Added explicit typography and interaction hierarchy guidance to the Atlas UI/UE system guide.
- Reviewed the latest `Customers`, `Accounts`, and `Pipeline` concepts against current web interface guidelines and the local frontend art-direction skill.
- Implemented the Atlas-only five-screen refinement across `Customers`, `Accounts`, and `Pipeline`.
- Updated Atlas render tests to lock the new page hierarchy, delete copy, and note-expansion copy.
- Opened up the page titles so the current object or task is the primary heading instead of the concept name.
- Reduced Atlas glass-card feel, removed the fake DELETE confirmation row, and unified delete actions around simpler destructive copy.

## Files Updated This Round

- `src/concepts/customerConceptStyles.css`
- `src/concepts/CustomerConceptLab.tsx`
- `src/concepts/AccountConceptLab.tsx`
- `src/concepts/PipelineConceptLab.tsx`
- `tests/customerConceptLabRender.ts`
- `tests/accountConceptLabRender.ts`
- `tests/pipelineConceptLabRender.ts`
- `docs/superpowers/specs/2026-03-31-crm-customer-concepts-design.md`
- `docs/superpowers/specs/2026-03-31-atlas-accounts-concepts-design.md`
- `docs/superpowers/specs/2026-03-31-atlas-pipeline-concepts-design.md`
- `docs/superpowers/specs/2026-03-31-atlas-crm-ui-ue-system-guide.md`
- `docs/superpowers/specs/2026-03-31-atlas-five-screen-refinement-design.md`
- `docs/superpowers/plans/2026-03-31-atlas-five-screen-refinement.md`

## Key Design Decisions

- Atlas remains the default industrial design baseline.
- List pages are scan-first surfaces, not KPI-first dashboards.
- Preview should be layered, not permanently consume layout width.
- Detail pages should use three clear rails:
  - left rail for identity and actions
  - center rail for main business content
  - right rail for supporting context and workflow signals
- Long values clamp first and expand on demand.
- Custom fields must support pinned groups plus collapsed overflow groups.
- Atlas page titles should always describe the current object or task first.
- Atlas delete dialogs should use one shared destructive pattern and avoid fake confirmation inputs.
- Atlas action density should stay lower than the previous concept round, with one clear primary action in each local area.

## Verification Completed

- `npm run type-check`
- `npm run build`
- contract tests for customer, account, pipeline
- render tests for customer, account, pipeline
- Atlas render tests for customer, account, pipeline passed after the refinement update

## Notes

- Build still shows the existing Vite chunk-size warning, but the build completes successfully.
- Local concept preview remains available via the Vite app entry points.
