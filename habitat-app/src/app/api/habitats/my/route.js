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
    
    // Identify the user (first try with id, then email if id is not available)
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Fetch habitat entries for the current user only
    let habitats;
    
    if (userId) {
      // If we have a userId, try to filter by that first
      habitats = await Habitat.find({ user: userId }).sort({ createdAt: -1 });
    } else {
      // Otherwise, filter by email
      habitats = await Habitat.find({ userEmail: userEmail }).sort({ createdAt: -1 });
    }
    
    return NextResponse.json({ habitats });
  } catch (error) {
    console.error('Error fetching user habitats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}