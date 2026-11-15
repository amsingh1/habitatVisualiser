// One-off: fill in the vegetation unit codes (code, EVC_code) on existing
// records. New and edited records get them on save; records saved between
// March 2026 and this change have them empty, and older records edited to a
// different alliance can carry a stale code.
//
// The codes come from the reference list (eu_veg_units) by the record's most
// detailed unit name, the same rule as on save (src/lib/vegCodes.js).
//
// Run from habitat-app/. Back up the database first.
//   MONGODB_URI=mongodb://... node scripts/backfill-veg-codes.mjs          # report only
//   MONGODB_URI=mongodb://... node scripts/backfill-veg-codes.mjs --apply  # write changes
//
// Only `code` and `EVC_code` are written. A record whose name is not in the
// reference list is reported and left unchanged.

import { MongoClient } from 'mongodb';
import { resolveVegCodes } from '../src/lib/vegCodes.js';

const apply = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Set MONGODB_URI first.');
  process.exit(1);
}

const escapeRegex = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db();
  const habitats = db.collection('habitats');
  const units = db.collection('eu_veg_units');

  const cache = new Map();
  const findUnitsByName = async (name) => {
    const key = name.toLowerCase();
    if (!cache.has(key)) {
      cache.set(key, await units
        .find({ name_without_authority: { $regex: '^' + escapeRegex(name) + '$', $options: 'i' } })
        .project({ code: 1, EVC_code: 1 })
        .toArray());
    }
    return cache.get(key);
  };

  let total = 0, unchanged = 0, notFound = 0;
  const changes = [];
  const cursor = habitats.find({}, {
    projection: { habitatName: 1, vegClass: 1, vegOrder: 1, vegAlliance: 1, code: 1, EVC_code: 1 },
  });
  for await (const h of cursor) {
    total++;
    const codes = await resolveVegCodes(h, findUnitsByName);
    if (!codes) {
      notFound++;
      console.log(`not in reference list: ${h._id} "${h.vegAlliance || h.vegOrder || h.vegClass || h.habitatName || ''}"`);
      continue;
    }
    if ((h.code || '') === codes.code && (h.EVC_code || '') === codes.EVC_code) {
      unchanged++;
      continue;
    }
    changes.push({ _id: h._id, from: { code: h.code || '', EVC_code: h.EVC_code || '' }, to: codes });
  }

  for (const c of changes.slice(0, 20)) {
    console.log(`${c._id}: code "${c.from.code}" -> "${c.to.code}", EVC_code "${c.from.EVC_code}" -> "${c.to.EVC_code}"`);
  }
  if (changes.length > 20) console.log(`... and ${changes.length - 20} more`);

  console.log(`\nrecords: ${total}, already correct: ${unchanged}, to update: ${changes.length}, name not found: ${notFound}`);

  if (apply && changes.length > 0) {
    const result = await habitats.bulkWrite(changes.map((c) => ({
      updateOne: { filter: { _id: c._id }, update: { $set: { code: c.to.code, EVC_code: c.to.EVC_code } } },
    })));
    console.log(`updated: ${result.modifiedCount}`);
  } else if (!apply) {
    console.log('Report only. Run again with --apply to write these changes.');
  }
} finally {
  await client.close();
}
