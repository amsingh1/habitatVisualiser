# Tester feedback (November 2026)

Comments from user testing, one branch per kind of change. Update the status
column as each is done.

| # | Comment | Branch | Status |
|---|---|---|---|
| 1 | Explore: search for orders and classes, not only alliances | `ccr-5bc50061-mwxere` | Done, see below |
| 2 | Upload: site name added after the auto-filled State/Region is lost when the record is edited | `fix/site-name-overwritten` | To do |
| 3 | Wording and capitals: "Explore vegetation types", "Recently added records", "Upload new vegetation record", "My observations", "all times" | `chore/title-wording` | To do |
| 4 | Save the vegetation type codes (`code`, `EVC_code`) again on create and edit, and fill in existing records | `fix/save-vegetation-code` | To do, needed by 5 |
| 5 | Export: all images in one folder, named `<alliance>_<EVC_code>_<record id>_<n>`; "Habitat Name" → "Alliance name"; Latitude and Longitude columns | `feature/export-files-and-columns` | To do |

## 1. Search by order and class

The "Vegetation type" search (simple and advanced, Explore and My
observations, list and map) now matches a record's own name **or** its
order **or** its class (`src/lib/vegTypeSearch.js`). Suggestions show the
level ("Alliance", "Order", "Class") and the code when there is one.
Choosing an order or class lists every record that belongs to it.

Known gap: records uploaded before March 2026 (commit `f4ef2d0`) have no
`vegOrder`/`vegClass` stored, so they are found by their own name but not by
their order or class. The backfill script planned in item 4 should also fill
`vegOrder` and `vegClass` for those records, from their `code`.

## Findings that the other items depend on

- **Site name (item 2):** on edit, loading the saved coordinates re-runs the
  address lookup in `HabitatUpload.jsx` and overwrites State/Region (and
  Country) about 0.8 s later. Saving the edit then really loses the site name.
- **Codes (item 4):** since commit `f4ef2d0` (8 March 2026) neither `code` nor
  `EVC_code` is saved on new records, and edit does not update them when the
  alliance changes. The export's "Code" and "EVC Code" columns are empty for
  new records.
- **Export names (item 5):** "record code" means `EVC_code` (owner decision).
  It belongs to the vegetation type, so two records of the same alliance
  share it. The record ID part keeps file names unique; confirm with the
  tester.
