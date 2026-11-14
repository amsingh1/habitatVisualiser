import escapeRegex from '@/lib/escapeRegex';

/**
 * MongoDB regex that matches `text` at the start of any word in a field,
 * case-insensitive. Used for the State/Region search, where users write the
 * region and a site name in one field ("Bavaria, Murnau moor"): both
 * "Bavaria" and "Murnau" find that record, whichever comes first.
 *
 * A word starts at the beginning of the field or after a space or one of
 * , . ; : / ( ) - – — ' "
 */
const WORD_START = `(^|[\\s,.;:/()\\-–—'"])`;

export default function wordStartRegex(text) {
  return { $regex: WORD_START + escapeRegex(text), $options: 'i' };
}
