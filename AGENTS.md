# adhd-helper

Small, self-contained tools for managing time and capturing thoughts. Keep the
tool set small; additions should answer an actual need.

## Before changing code

Read `CONTEXT.md` for the project's vocabulary. Read `docs/agents/domain.md` and
the ADRs relevant to the behavior being changed. Follow superseding ADRs and
surface conflicts with existing decisions explicitly.

For local setup and verification commands, read `README.md` and `package.json`.

## Architecture

- `src/lib/*.svelte.ts` holds reactive tool state. Keep time arithmetic
  independent of browser effects and testable with a supplied timestamp.
- `src/routes/+layout.svelte` owns tool hydration, persistence, ticking, and
  announcements so tools continue across navigation.
- Derive time from timestamps; intervals refresh displays rather than accumulate
  elapsed time.
- `src/lib/persistence.ts` is the boundary for stored data. Preserve usable
  snapshots from older versions when adding fields. Missing new fields must not
  discard a running timer or stretch.
- Keep notes in the browser and clear them only through an explicit user action.

## Product decisions

Read the relevant ADR before changing these behaviors:

- Desktop-only static hosting: ADR 0001.
- Notes and breaks: ADR 0002, updated by ADR 0006.
- Uncapped day length: ADR 0003.
- Fixed one-hour dial and twelve-hour timer limit: ADR 0005.
- Current-stretch account in an overlay: ADR 0006.
- Fixed twelve-hour day timeline: ADR 0007.

ADRs live in `docs/adr/`. Parked GitHub issues describe conditions for
revisiting decisions; they are not requests to implement those features.

## Verification

Run checks appropriate to the change using `package.json` and CI as the sources
of truth. Before handing off code changes, run the formatting, type, unit-test,
and build checks used by `.github/workflows/ci.yml`.

For behavior fixes, add a regression test at the layer where the failure occurs.
Model tests alone do not verify browser integration.

When changing browser interactions, verify the affected flow in a browser.
Include keyboard behavior and modal focus when relevant. For timing or
persistence changes, cover the relevant completion, pause/resume, navigation,
reload, midnight, or daylight-saving boundary.

Report checks actually performed and any verification that remains blocked.

## Workflows

- When reading or managing issues, read `docs/agents/issue-tracker.md`.
- When triaging issues, also read `docs/agents/triage-labels.md`.
- Before writing a commit, read `docs/agents/commits.md`.

## Communication

Lead with the result or next action. Keep progress updates short and make
completed work visible. Number multi-step plans, with at most five steps per
list. Ask only for decisions that cannot be resolved from the repository. When
work remains, end with one concrete next action.
