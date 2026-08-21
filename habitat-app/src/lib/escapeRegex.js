/**
 * Escape regex metacharacters in user-supplied text.
 *
 * Search values arrive from query strings and are interpolated into MongoDB
 * `$regex` patterns. Without escaping, input such as `(a+)+$` is evaluated as
 * a pattern rather than a literal and triggers catastrophic backtracking —
 * a single request can pin a CPU core indefinitely.
 *
 * Always wrap user input before building a pattern from it:
 *   { $regex: '^' + escapeRegex(query), $options: 'i' }
 */
export default function escapeRegex(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
