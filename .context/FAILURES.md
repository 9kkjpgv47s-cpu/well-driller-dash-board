# Failures / thrash list

## Documented

- **Assuming viewer path without env:** repo will not auto-discover DNR viewer (`AGENTS.md`). Always export WELL_VIEWER_ROOT / DNR_VIEWER_ROOT.
- **Importing viewer Python from hub:** hub has its own `scripts/dnr_csv_input.py` — do not import from viewer checkout (AGENTS).
- **Classify history:** see `docs/DNR_CLASSIFY_REVERT.md` before reintroducing old classify paths.
- **Lithology windows are long / bounded fetch:** report notes window caps and cache-backed uplift; don’t claim 90% without KPI JSON evidence.

## Empty until lived under this pack

(none new)
