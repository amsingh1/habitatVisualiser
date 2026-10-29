import { NextResponse } from 'next/server';
import EuVegUnits from '@/models/eu_veg_units';
import mongoose from 'mongoose';
import escapeRegex from '@/lib/escapeRegex';

// Code pattern filters for each vegetation hierarchy level
const CODE_PATTERNS = {
  class:    /^[A-Z]{2}$/,
  order:    /^[A-Z]{2}\d{2}$/,
  alliance: /^[A-Z]{2}\d{2}[A-Z]$/,
};

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query     = searchParams.get('query');
  const type      = searchParams.get('type');       // 'class' | 'order' | 'alliance'
  const classCode = searchParams.get('classCode');  // filter order/alliance by parent class code
  const orderCode = searchParams.get('orderCode');  // filter alliance by parent order code
  const code      = searchParams.get('code');       // exact code lookup (for auto-fill)
  const name      = searchParams.get('name');       // exact (case-insensitive) name lookup
  const fetchAll  = searchParams.get('fetchAll') === 'true';
  const paged     = searchParams.get('paged') === 'true';

  // Paged mode (dropdowns): query is optional, results come in batches via limit/skip.
  // Exact lookups and fetchAll also bypass the query-length check.
  if (!code && !name && !fetchAll && !paged && (!query || query.trim().length < 2)) {
    return NextResponse.json(
      { message: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = process.env.MONGODB_URI;
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in environment variables');
      }

      await mongoose.connect(MONGODB_URI);
    }

    // Build the database query
    const dbQuery = {};

    if (code) {
      // Exact code lookup — used for auto-filling parent fields
      dbQuery.code = code;
    } else {
      if (name) {
        dbQuery.name_without_authority = { $regex: '^' + escapeRegex(name) + '$', $options: 'i' };
      } else if (query && (paged || !fetchAll)) {
        // Paged mode matches anywhere in the name; legacy mode matches the start only
        const prefix = paged ? '' : '^';
        dbQuery.name_without_authority = { $regex: prefix + escapeRegex(query.trim()), $options: 'i' };
      }

      if (orderCode && type === 'alliance') {
        // Filter alliances that belong to a specific order
        dbQuery.code = { $regex: `^${escapeRegex(orderCode)}[A-Z]$` };
      } else if (classCode && (type === 'order' || type === 'alliance')) {
        // Filter order/alliance by the selected class code prefix
        const suffix = type === 'order' ? '\\d{2}$' : '\\d{2}[A-Z]$';
        dbQuery.code = { $regex: `^${escapeRegex(classCode)}${suffix}` };
      } else if (type && CODE_PATTERNS[type]) {
        dbQuery.code = { $regex: CODE_PATTERNS[type].source };
      }
    }

    if (paged) {
      const limit = Math.min(
        Math.max(parseInt(searchParams.get('limit'), 10) || DEFAULT_PAGE_SIZE, 1),
        MAX_PAGE_SIZE
      );
      const skip = Math.max(parseInt(searchParams.get('skip'), 10) || 0, 0);

      // Fetch one extra row to know whether another page exists
      const rows = await EuVegUnits.find(dbQuery)
        .select('_id code EVC_code name_without_authority')
        .sort({ code: 1 })
        .skip(skip)
        .limit(limit + 1);

      return NextResponse.json({ units: rows.slice(0, limit), hasMore: rows.length > limit });
    }

    // Non-paged lookups: exact code/name return a handful, fetchAll returns everything
    // that matches (the collection is small), typed searches return at most 10.
    let limitVal = 10;
    if (code) {
      limitVal = 1;
    } else if (name) {
      limitVal = 5;
    } else if (fetchAll) {
      limitVal = 0;
    }

    const units = await EuVegUnits.find(dbQuery)
      .select('_id code EVC_code name_without_authority')
      .limit(limitVal)
      .sort({ code: 1 });

    return NextResponse.json({ units });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { message: 'Error searching EU vegetation units', error: error.message },
      { status: 500 }
    );
  }
}
