'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 250;
const SCROLL_THRESHOLD_PX = 60;

/**
 * Text input with a server-backed, infinitely scrolling dropdown of EU vegetation units
 * (class / order / alliance). The first batch loads on focus, more batches load as the
 * user scrolls to the bottom, and typing re-queries the server so every match is reachable.
 *
 * The parent owns the text and the selection logic:
 *  - onTextChange(text)  — every keystroke
 *  - onSelect(unit)      — a unit was picked (or an exact name was typed and confirmed on blur)
 *  - onEmpty()           — the box was left empty
 *  - onInvalid()         — non-empty text that matches no unit was left in the box
 * `confirmedValue` is the last valid name, so blur skips the server check when nothing changed.
 */
export default function VegUnitCombobox({
  id,
  type,
  value,
  confirmedValue = '',
  classCode = '',
  orderCode = '',
  placeholder,
  required = false,
  onTextChange,
  onSelect,
  onEmpty,
  onInvalid,
}) {
  const [open, setOpen] = useState(false);
  // Only filter by the text once the user has typed; on focus show the full list
  const [dirty, setDirty] = useState(false);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const listRef = useRef(null);

  const search = dirty ? value.trim() : '';

  const load = useCallback(async (skip) => {
    // A new first page invalidates anything still in flight
    const myRequest = skip === 0 ? ++requestId.current : requestId.current;
    const params = new URLSearchParams({ type, paged: 'true', limit: String(PAGE_SIZE), skip: String(skip) });
    if (search) params.set('query', search);
    if (classCode && type !== 'class') params.set('classCode', classCode);
    if (orderCode && type === 'alliance') params.set('orderCode', orderCode);

    setLoading(true);
    try {
      const response = await fetch(`/api/eu-veg-units/search?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (myRequest !== requestId.current) return;
      setItems(prev => (skip === 0 ? data.units : [...prev, ...data.units]));
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      console.error('Error loading EU Veg Units:', err);
      if (myRequest !== requestId.current) return;
      if (skip === 0) setItems([]);
      setHasMore(false);
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  }, [type, search, classCode, orderCode]);

  // (Re)load the first page whenever the dropdown opens or its filters change
  useEffect(() => {
    if (!open) return undefined;
    // Drop any batch still in flight for the previous filter before the debounce fires
    requestId.current += 1;
    const timer = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
      load(0);
    }, search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [open, load, search]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    if (loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX) {
      load(items.length);
    }
  };

  const handleBlur = async () => {
    setOpen(false);
    setDirty(false);
    const text = value.trim();
    if (text === '') {
      onEmpty?.();
      return;
    }
    if (text === confirmedValue) return;

    // The loaded batches may not include this name, so ask the server
    try {
      const params = new URLSearchParams({ type, name: text });
      const response = await fetch(`/api/eu-veg-units/search?${params}`);
      const data = response.ok ? await response.json() : null;
      const unit = data?.units?.[0];
      if (unit) onSelect(unit);
      else onInvalid?.();
    } catch {
      onInvalid?.();
    }
  };

  const pick = (unit) => {
    setOpen(false);
    setDirty(false);
    onSelect(unit);
  };

  return (
    <div className="relative">
      <input
        type="text"
        id={id}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-600 focus:border-emerald-600"
        value={value}
        onChange={(e) => {
          setDirty(true);
          setOpen(true);
          onTextChange(e.target.value);
        }}
        onFocus={() => {
          setDirty(false);
          setOpen(true);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {open && (
        <ul
          ref={listRef}
          onScroll={handleScroll}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-10 bg-white w-full mt-1 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {items.map((unit) => (
            <li
              key={unit._id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => pick(unit)}
            >
              <div className="font-medium">{unit.name_without_authority}</div>
              <div className="text-xs text-gray-500">Code: {unit.code}</div>
            </li>
          ))}
          {loading && <li className="px-4 py-2 text-sm text-gray-500">Loading...</li>}
          {!loading && items.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-500">No matches</li>
          )}
        </ul>
      )}
    </div>
  );
}
