/**
 * Export format: CSV metadata and image file names (ZIP download).
 *
 * All images go into one folder, each with a unique name:
 *   <alliance>_<EVC code>_<record id>_<image number>.<ext>
 *   e.g. Arrhenatherion_elatioris_RA01A_a1b2c3_1.jpg
 * The record id (last 6 characters) keeps names unique when two records have
 * the same alliance. The CSV "Image ID" column holds the same name without
 * the extension, so each row matches its file.
 */

// Alliance of a record. Records from before March 2026 have no
// alliance/order/class fields; their habitatName is the unit chosen then.
export function allianceName(h) {
  if (h.vegAlliance) return h.vegAlliance;
  if (!h.vegClass && !h.vegOrder) return h.habitatName || '';
  return '';
}

// "48.1,11.5" -> { latitude: '48.1', longitude: '11.5' }
export function splitCoordinates(gpsCoordinate) {
  const parts = (gpsCoordinate || '').split(',').map((p) => p.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { latitude: '', longitude: '' };
  return { latitude: parts[0], longitude: parts[1] };
}

// Safe file name part: accents removed (Württemberg -> Wurttemberg), anything
// other than letters, digits, - and . becomes _, repeats collapsed.
export function fileNamePart(value) {
  return String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\-.]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Base name (no extension) for image `index` (0-based) of a record.
export function imageBaseName(h, index, idLength = 6) {
  const name = allianceName(h) || h.vegOrder || h.vegClass || h.habitatName || 'record';
  const id = String(h._id || '');
  return [name, h.EVC_code, id.slice(-idLength), index + 1]
    .map(fileNamePart)
    .filter(Boolean)
    .join('_');
}

// Base names for all images of all records, unique within the export. If two
// records share the short id, the full record id is used for the later one.
export function imageBaseNames(habitats) {
  const used = new Set();
  const names = new Map(); // record id -> [base names]
  for (const h of habitats) {
    const count = h.imageUrl ? h.imageUrl.length : 0;
    const list = [];
    for (let i = 0; i < count; i++) {
      let base = imageBaseName(h, i);
      if (used.has(base)) base = imageBaseName(h, i, Infinity);
      used.add(base);
      list.push(base);
    }
    names.set(String(h._id), list);
  }
  return names;
}

// One CSV cell: quoted, inner quotes doubled.
const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const CSV_HEADERS = [
  'Habitat ID', 'Image ID', 'Alliance name', 'Order', 'Class', 'State', 'Country',
  'Latitude', 'Longitude', 'Coordinate Uncertainty (m)', 'Date',
  'Dominant Species 1', 'Dominant Species 2', 'Dominant Species 3',
  'Notes', 'Code', 'EVC Code', 'Author Name', 'Author Email', 'Created At',
];

// CSV text: one row per image (Image ID = the image's file name without
// extension); a record without images gets one row with an empty Image ID.
export function generateCSV(habitats) {
  const names = imageBaseNames(habitats);
  const rows = [];
  for (const h of habitats) {
    const { latitude, longitude } = splitCoordinates(h.gpsCoordinate);
    const row = (imageId) => [
      h._id, imageId, allianceName(h), h.vegOrder, h.vegClass, h.state, h.country,
      latitude, longitude, h.coordinateUncertaintyMeters,
      h.date ? new Date(h.date).toISOString().split('T')[0] : '',
      h.dominantSpecies1, h.dominantSpecies2, h.dominantSpecies3,
      h.notes, h.code, h.EVC_code, h.userName, h.userEmail,
      h.createdAt ? new Date(h.createdAt).toISOString() : '',
    ].map(cell).join(',');
    const imageIds = names.get(String(h._id)) || [];
    if (imageIds.length === 0) rows.push(row(''));
    else imageIds.forEach((id) => rows.push(row(id)));
  }
  return CSV_HEADERS.join(',') + '\n' + rows.join('\n');
}
