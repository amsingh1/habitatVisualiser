/**
 * Vegetation unit codes saved on a record.
 *
 * A record stores the code (e.g. "RA01A") and EVC_code of its most detailed
 * chosen unit: the alliance, else the order, else the class. They come from
 * the reference list (eu_veg_units) by the unit's name. Saving them stopped
 * in March 2026 (commit f4ef2d0); they are needed again for the export file
 * names.
 *
 * No imports here, so the backfill script can use this file as well.
 */

const LEVELS = [
  { field: 'vegAlliance', pattern: /^[A-Z]{2}\d{2}[A-Z]$/ },
  { field: 'vegOrder', pattern: /^[A-Z]{2}\d{2}$/ },
  { field: 'vegClass', pattern: /^[A-Z]{2}$/ },
];

// The most detailed unit name chosen on a record, and its level pattern.
// Older records (before March 2026) only have habitatName; any level fits.
export function mostDetailedUnit(record) {
  for (const { field, pattern } of LEVELS) {
    const name = (record[field] || '').trim();
    if (name) return { name, pattern };
  }
  const name = (record.habitatName || '').trim();
  return name ? { name, pattern: null } : null;
}

// From the reference units with that name, pick the one at the right level.
// Falls back to any unit with that name: records edited after March 2026
// could carry an alliance name in vegClass.
export function pickUnit(units, pattern) {
  if (!units || units.length === 0) return null;
  return (pattern && units.find((u) => pattern.test(u.code || ''))) || units[0];
}

// { code, EVC_code } for a record, or null if the name is not in the
// reference list. `findUnitsByName(name)` returns reference units
// ({ code, EVC_code }) whose name matches, ignoring case.
export async function resolveVegCodes(record, findUnitsByName) {
  const unit = mostDetailedUnit(record);
  if (!unit) return null;
  const found = pickUnit(await findUnitsByName(unit.name), unit.pattern);
  return found ? { code: found.code || '', EVC_code: found.EVC_code || '' } : null;
}
