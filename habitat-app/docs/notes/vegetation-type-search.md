# Vegetation type search: alliance, order and class

Tester comment (November 2026): the "Vegetation type" search on Explore only
found alliances; it should also find the orders and classes that are filled
in automatically on upload.

Status: built, waiting for an app test (below). Do not merge until tested.

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
  Filling `vegOrder`/`vegClass` for them needs a separate one-off backfill.
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
3. Type an **alliance** name: labelled "Alliance" with its code if any.
   Picking it lists that alliance's records. Typing only the start of a name
   can now also list records whose order or class starts the same way.
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
