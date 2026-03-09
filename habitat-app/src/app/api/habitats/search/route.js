import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habitat from '@/models/Habitat';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req) {
  try {
    // Get search parameters from URL
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const state = searchParams.get('state') || '';
    const country = searchParams.get('country') || '';
    
    await connectDB();
    
    // Get current user session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Build search criteria
    const searchCriteria = {};
    
    if (query) {
      const searchRegex = new RegExp('^' + query, 'i');
      searchCriteria.habitatName = { $regex: searchRegex };
    }
    
    if (state) {
      const stateRegex = new RegExp('^' + state, 'i');
      searchCriteria.state = { $regex: stateRegex };
    }
    
    if (country) {
      const countryRegex = new RegExp('^' + country, 'i');
      searchCriteria.country = { $regex: countryRegex };
    }
    
    // Search for habitats matching the criteria
    const habitats = await Habitat.find(searchCriteria).limit(10);
    
    return NextResponse.json({ habitats });
  } catch (error) {
    console.error('Error searching habitats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}