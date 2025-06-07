// app/api/habitats/search/route.js
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
    
    // Get search parameters from URL
    const { searchParams } = new URL(req.url);
    const searchText = searchParams.get('q') || '';
    const searchField = searchParams.get('field') || 'habitatName'; // Default to habitatName
    const context = searchParams.get('context') || 'habitats';
    
    // Identify the user
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Build the search query
    let searchQuery = {};
    
    // If context is 'personal', only search user's own habitats
    if (context === 'personal') {
      if (userId) {
        searchQuery.user = userId;
      } else {
        searchQuery.userEmail = userEmail;
      }
    }
    
    // If search text is provided, add text search condition
    if (searchText.trim()) {
      // Create search condition for the selected field - using exact match (case insensitive)
      const fieldCondition = {
        [searchField]: { $regex: `^${searchText}$`, $options: 'i' }
      };
      
      // If we already have user filters, combine with $and
      if (Object.keys(searchQuery).length > 0) {
        searchQuery = {
          $and: [
            searchQuery,
            fieldCondition
          ]
        };
      } else {
        // Otherwise just use the field condition
        searchQuery = fieldCondition;
      }
    }
    
    // Execute the search
    const habitats = await Habitat.find(searchQuery).sort({ createdAt: -1 });
    
    return NextResponse.json({ habitats });
  } catch (error) {
    console.error('Error searching habitats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}