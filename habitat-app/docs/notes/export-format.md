# Export format and vegetation codes

Tester feedback (November 2026) on the export, done in `feature/export-files-and-columns`.

## ZIP and CSV

- All images in one folder, `images/`, named
  `<alliance>_<EVC code>_<record id>_<n>.<ext>`, e.g.
  `Arrhenatherion_elatioris_RA01A_a1b2c3_1.jpg`. The record id (last 6
  characters, full id if two records share it) keeps names unique when
  records have the same alliance. Records without an alliance use the order
  or class name. Rules in `src/lib/exportFormat.js`.
- CSV "Image ID" = that file name without the extension.
- CSV columns: "Habitat Name" is now "Alliance name" (the alliance only),
  with new "Order" and "Class" columns so order- or class-only records keep
  their vegetation type. "GPS Coordinate" is now "Latitude" and "Longitude".

## Vegetation codes (`code`, `EVC_code`)

"Record code" in the file name means `EVC_code` (owner decision). Saving it
stopped in March 2026 (commit `f4ef2d0`); create and edit save both codes
again (`src/lib/vegCodes.js`).

**Owner to-do:** existing records need the one-off backfill, otherwise
their file names have no code. Back up the database, then from `habitat-app/`:

```
MONGODB_URI=... node scripts/backfill-veg-codes.mjs          # report only
MONGODB_URI=... node scripts/backfill-veg-codes.mjs --apply  # write
```
