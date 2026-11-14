/**
 * Decide whether a location the app looked up (from photo GPS, the map or
 * typed coordinates) may replace what is in a form field.
 *
 * The app may fill the field only when the user has not typed in it: the
 * field is empty, or still holds the value the app itself filled last.
 * Otherwise the user's text is kept and the found value is offered as a
 * suggestion they can apply with one click.
 *
 *   current  - what the field holds now
 *   lastAuto - the value the app filled last ('' if none)
 *   found    - the value just looked up ('' if the lookup found nothing)
 *
 * Returns { value, lastAuto, suggestion }; suggestion is '' when there is
 * nothing to offer.
 */
export function mergeAutoField(current, lastAuto, found) {
  const cur = (current || '').trim();
  const next = (found || '').trim();

  // Nothing found: leave the field alone.
  if (!next) return { value: current, lastAuto, suggestion: '' };

  // Empty, or still the app's own value: fill it.
  if (!cur || cur === (lastAuto || '').trim()) {
    return { value: next, lastAuto: next, suggestion: '' };
  }

  // The user's text already says the same: nothing to offer.
  if (cur === next) return { value: current, lastAuto, suggestion: '' };

  // The user typed something else: keep it, offer the found value.
  return { value: current, lastAuto, suggestion: next };
}
