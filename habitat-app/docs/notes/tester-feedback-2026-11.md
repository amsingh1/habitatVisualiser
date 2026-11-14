# Tester feedback (November 2026)

Comments from user testing, one branch per kind of change. Update the status
column as each is done.

| # | Comment | Branch | Status |
|---|---|---|---|
| 1 | Explore: search for orders and classes, not only alliances | `ccr-5bc50061-mwxere` | Built, waiting for app test (below). Do not merge yet |
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

What is stored depends on when a record was created. This comes from the code
history and has not been checked against the database:

- before 8 Mar 2026 (commit `f4ef2d0`): only `habitatName`, no
  alliance/order/class fields. Found by their own name only, unless edited
  and saved since. Count them with
  `db.habitats.countDocuments({ $or: [{ vegClass: { $in: ["", null] } }, { vegClass: { $exists: false } }] })`.
  The backfill in item 4 should fill `vegOrder`/`vegClass` for them.
- 8-25 Mar 2026 (until commit `cda6a85`): `habitatName` was saved as the
  class and the alliance only in `vegAlliance`, which is why the search also
  matches `vegAlliance`.
- since 25 Mar 2026: `habitatName` is the alliance (or order/class if none).

### Still to test (before merging)

Tested so far: the matching rule in Node (13 checks), production build, lint.
Not yet tested against a database or in the browser. When someone is at a
computer, either run the branch locally with `pnpm run dev`, or let the agent
run a temporary in-memory MongoDB, then check:

1. Explore, simple search, type part of an **order** name: suggestions show
   it labelled "Order"; choosing it lists records of every alliance in it.
2. Same for a **class** name ("Class").
3. Type an **alliance** name: labelled "Alliance" with its code if any;
   results unchanged from before.
4. A record created 8-25 Mar 2026 is found by its alliance name.
5. A record created before 8 Mar 2026 is still found by its own name.
6. Advanced search, Vegetation type field: same as 1-3.
7. My observations: same as 1-3, and only the user's own records appear.
8. Map view with an order search shows the same records as the list.
9. State/Region, Country and User name searches behave as before.

Real-data check (run in `mongosh` on the live database, counts only):

```js
db.habitats.countDocuments({ createdAt: { $lt: ISODate("2026-03-08") } })
db.habitats.countDocuments({ createdAt: { $gte: ISODate("2026-03-08"), $lt: ISODate("2026-03-25") } })
db.habitats.countDocuments({ $or: [{ vegClass: { $in: ["", null] } }, { vegClass: { $exists: false } }] })
```

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
