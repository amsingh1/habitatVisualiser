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
    
    await connectDB();
    
    // Get current user session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Create regex for case-insensitive search
    const searchRegex = new RegExp(query, 'i');
    
    // Search for habitats matching the query
    const habitats = await Habitat.find({
      habitatName: { $regex: searchRegex }
    }).limit(10);
    
    return NextResponse.json({ habitats });
  } catch (error) {
    console.error('Error searching habitats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}