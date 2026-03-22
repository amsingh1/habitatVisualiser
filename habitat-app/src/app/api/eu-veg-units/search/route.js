import { NextResponse } from 'next/server';
import EuVegUnits from '@/models/eu_veg_units';
import mongoose from 'mongoose';

// Code pattern filters for each vegetation hierarchy level
const CODE_PATTERNS = {
  class:    /^[A-Z]{2}$/,
  order:    /^[A-Z]{2}\d{2}$/,
  alliance: /^[A-Z]{2}\d{2}[A-Z]$/,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query     = searchParams.get('query');
  const type      = searchParams.get('type');       // 'class' | 'order' | 'alliance'
  const classCode = searchParams.get('classCode');  // filter order/alliance by parent class code
  const orderCode = searchParams.get('orderCode');  // filter alliance by parent order code
  const code      = searchParams.get('code');       // exact code lookup (for auto-fill)
  const fetchAll  = searchParams.get('fetchAll') === 'true';

  // Exact code lookup bypasses the query-length check
  if (!code && !fetchAll && (!query || query.trim().length < 2)) {
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
      if (!fetchAll && query) {
        dbQuery.name_without_authority = { $regex: '^' + query, $options: 'i' };
      }

      if (orderCode && type === 'alliance') {
        // Filter alliances that belong to a specific order
        const escaped = orderCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        dbQuery.code = { $regex: `^${escaped}[A-Z]$` };
      } else if (classCode && (type === 'order' || type === 'alliance')) {
        // Filter order/alliance by the selected class code prefix
        const escaped = classCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const suffix  = type === 'order' ? '\\d{2}$' : '\\d{2}[A-Z]$';
        dbQuery.code  = { $regex: `^${escaped}${suffix}` };
      } else if (type && CODE_PATTERNS[type]) {
        dbQuery.code = { $regex: CODE_PATTERNS[type].source };
      }
    }

    // Find units matching the query.
    // Class fetches have no limit (classes are few). Order/alliance retain a 300-item cap.
    // Exact code lookups return at most 1 result.
    let limitVal = 10;
    if (code) {
      limitVal = 1;
    } else if (fetchAll) {
      limitVal = type === 'class' ? 0 : 300;
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
