// Coordinate uncertainty (metres): optional radius around the recorded point
// within which the true location lies. Shared by the form, API and model.
export const MAX_COORDINATE_UNCERTAINTY_M = 100000; // 100 km

// Returns { value: number|null } for empty/valid input, or { error: string }.
export function parseCoordinateUncertainty(input) {
  if (input === undefined || input === null) return { value: null };
  if (typeof input === 'string' && input.trim() === '') return { value: null };
  const n = typeof input === 'number' ? input : Number(String(input).trim());
  if (!Number.isFinite(n) || n < 0) {
    return { error: 'Coordinate uncertainty must be a non-negative number of metres' };
  }
  if (n > MAX_COORDINATE_UNCERTAINTY_M) {
    return {
      error: `Coordinate uncertainty cannot exceed ${MAX_COORDINATE_UNCERTAINTY_M.toLocaleString('en-US')} metres`,
    };
  }
  return { value: n };
}
