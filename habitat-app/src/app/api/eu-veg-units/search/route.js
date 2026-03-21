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
  const type      = searchParams.get('type');      // 'class' | 'order' | 'alliance'
  const classCode = searchParams.get('classCode'); // optional: filter order/alliance by parent class code
  const fetchAll  = searchParams.get('fetchAll') === 'true'; // load all options (no text filter)

  if (!fetchAll && (!query || query.trim().length < 2)) {
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

    // Build query: filter by name (when not fetchAll) and, when type is given, by code pattern
    const dbQuery = {};
    if (!fetchAll && query) {
      dbQuery.name_without_authority = { $regex: '^' + query, $options: 'i' };
    }
    if (classCode && (type === 'order' || type === 'alliance')) {
      // Filter order/alliance by the selected class code prefix
      const escaped = classCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const suffix  = type === 'order' ? '\\d{2}$' : '\\d{2}[A-Z]$';
      dbQuery.code  = { $regex: `^${escaped}${suffix}` };
    } else if (type && CODE_PATTERNS[type]) {
      dbQuery.code = { $regex: CODE_PATTERNS[type].source };
    }

    // Find units matching the query.
    // When fetching all class options, no limit is applied so every class is available.
    // Order/alliance fetches retain a 300-item cap since they are always scoped to a class.
    const applyLimit = !fetchAll || type !== 'class';
    const units = await EuVegUnits.find(dbQuery)
      .select('_id code EVC_code name_without_authority')
      .limit(applyLimit ? (fetchAll ? 300 : 10) : 0)
      .sort({ code: 1 });
    
    // Return the results
    return NextResponse.json({ units });
  } catch (error) {
    console.error('Search API error:', error);
    
    // Return a detailed error message
    return NextResponse.json(
      { 
        message: 'Error searching EU vegetation units',
        error: error.message
      },
      { status: 500 }
    );
  }
}