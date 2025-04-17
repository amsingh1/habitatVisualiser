import { NextResponse } from 'next/server';
import EuVegUnits from '@/models/eu_veg_units';
import mongoose from 'mongoose';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

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
    
    // Create regex query
    const regexQuery = { name_without_authority: { $regex: query, $options: 'i' } };
    
    // Find units matching the query
    const units = await EuVegUnits.find(regexQuery)
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