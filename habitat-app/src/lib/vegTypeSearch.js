import escapeRegex from '@/lib/escapeRegex';

/**
 * Search by vegetation type across the hierarchy.
 *
 * Matches `habitatName`, `vegAlliance`, `vegOrder` and `vegClass`, so a user
 * finds every record of an order or class, not only of one alliance.
 *
 * Why all four fields (from the code history, not checked against the data):
 * - before 8 Mar 2026 records had only `habitatName` (no alliance/order/class
 *   fields), so they are found by their own name only;
 * - 8-25 Mar 2026 `habitatName` was saved as the class, so the alliance is
 *   only in `vegAlliance`;
 * - since 25 Mar 2026 `habitatName` is the alliance (or order/class if none).
 */

function prefixRegex(text) {
  return { $regex: '^' + escapeRegex(text), $options: 'i' };
}

// MongoDB condition: habitatName, alliance, order or class starts with `text`.
export function vegTypeCondition(text) {
  const regex = prefixRegex(text);
  return {
    $or: [
      { habitatName: regex },
      { vegAlliance: regex },
      { vegOrder: regex },
      { vegClass: regex },
    ],
  };
}

// Same, plus the unit code (e.g. "RA01A"); used for suggestions.
export function vegTypeSuggestionCondition(text) {
  const condition = vegTypeCondition(text);
  condition.$or.push({ code: prefixRegex(text) });
  return condition;
}

// Level of a record's own unit (its habitatName).
function ownLevel(h) {
  if (h.vegAlliance && h.vegAlliance === h.habitatName) return 'Alliance';
  if (h.vegOrder && h.vegOrder === h.habitatName) return 'Order';
  if (h.vegClass && h.vegClass === h.habitatName) return 'Class';
  // Older records: work it out from the unit code (RA / RA01 / RA01A).
  if (/^[A-Z]{2}\d{2}[A-Z]$/.test(h.code || '')) return 'Alliance';
  if (/^[A-Z]{2}\d{2}$/.test(h.code || '')) return 'Order';
  if (/^[A-Z]{2}$/.test(h.code || '')) return 'Class';
  return '';
}

/**
 * Turn matching records into unique suggestions:
 * [{ habitatName, code, level }], where habitatName is the name to search for.
 */
export function buildVegTypeSuggestions(records, text, limit) {
  const starts = (value) =>
    typeof value === 'string' && value.toLowerCase().startsWith(text.toLowerCase());

  const seen = new Set();
  const suggestions = [];
  const add = (name, code, level) => {
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ habitatName: name, code: code || '', level });
  };

  for (const h of records) {
    if (suggestions.length >= limit) break;
    if (starts(h.habitatName) || starts(h.code)) add(h.habitatName, h.code, ownLevel(h));
    if (starts(h.vegAlliance)) add(h.vegAlliance, '', 'Alliance');
    if (starts(h.vegOrder)) add(h.vegOrder, '', 'Order');
    if (starts(h.vegClass)) add(h.vegClass, '', 'Class');
  }

  return suggestions.slice(0, limit);
}
