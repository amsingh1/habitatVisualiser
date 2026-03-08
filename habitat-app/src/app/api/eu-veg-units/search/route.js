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
  const query = searchParams.get('query');
  const type  = searchParams.get('type'); // 'class' | 'order' | 'alliance'

  if (!query || query.trim().length < 2) {
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
    
    // Build query: filter by name and, when type is given, by code pattern
    const dbQuery = { name_without_authority: { $regex: query, $options: 'i' } };
    if (type && CODE_PATTERNS[type]) {
      dbQuery.code = { $regex: CODE_PATTERNS[type].source };
    }
    
    // Find units matching the query
    const units = await EuVegUnits.find(dbQuery)
      .select('_id code EVC_code name_without_authority')
      .limit(10)
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