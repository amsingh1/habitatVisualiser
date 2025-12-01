import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habitat from '@/models/Habitat';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req) {
  try {
    await connectDB();
    
    // Get current user session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Get URL for query parameters
    const { searchParams } = new URL(req.url);
    
    // Get filter and sort parameters
    const monthFilter = searchParams.get('monthFilter');
    const yearFilter = searchParams.get('yearFilter');
    const sortBy = searchParams.get('sortBy') || 'upload_desc';
    
    // Identify the user (first try with id, then email if id is not available)
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Build query for user's habitats
    let query = {};
    
    if (userId) {
      query.user = userId;
    } else {
      query.userEmail = userEmail;
    }
    
    // Month filter (based on createdAt)
    if (monthFilter && monthFilter !== 'all') {
      const month = parseInt(monthFilter);
      query.$expr = query.$expr || {};
      query.$expr.$and = query.$expr.$and || [];
      query.$expr.$and.push({ $eq: [{ $month: '$createdAt' }, month] });
    }
    
    // Year filter (based on createdAt)
    if (yearFilter && yearFilter !== 'all') {
      const year = parseInt(yearFilter);
      query.$expr = query.$expr || {};
      query.$expr.$and = query.$expr.$and || [];
      query.$expr.$and.push({ $eq: [{ $year: '$createdAt' }, year] });
    }
    
    // Determine sort option
    let sortOption = { createdAt: -1 }; // default
    switch(sortBy) {
      case 'upload_asc':
        sortOption = { createdAt: 1 };
        break;
      case 'observation_desc':
        sortOption = { date: -1 };
        break;
      case 'observation_asc':
        sortOption = { date: 1 };
        break;
      case 'vegetation_asc':
        sortOption = { habitatName: 1 };
        break;
      case 'vegetation_desc':
        sortOption = { habitatName: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
    
    // Fetch habitat entries for the current user with filters and sorting
    const habitats = await Habitat.find(query).sort(sortOption);
    
    return NextResponse.json({ habitats });
  } catch (error) {
    console.error('Error fetching user habitats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}