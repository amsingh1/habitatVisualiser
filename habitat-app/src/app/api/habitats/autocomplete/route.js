// src/app/api/habitats/autocomplete/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habitat from '@/models/Habitat';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// API endpoint to get autocomplete suggestions
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
    const rawSearchText = searchParams.get('q') || '';
    const searchText = rawSearchText.trim();
    
    // Return empty results if search text is empty or only contains whitespace
    if (!searchText || searchText.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchField = searchParams.get('field') || 'habitatName'; // Default to habitatName
    const context = searchParams.get('context') || 'habitats';
    const limit = parseInt(searchParams.get('limit') || '20');
    
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

    // For habitatName, do a combined search by name OR EVC code
    if (searchField === 'habitatName') {
      const orCondition = {
        $or: [
          { habitatName: { $regex: '^' + searchText, $options: 'i' } },
          { code: { $regex: '^' + searchText, $options: 'i' } },
        ]
      };

      if (Object.keys(searchQuery).length > 0) {
        searchQuery = { $and: [searchQuery, orCondition] };
      } else {
        searchQuery = orCondition;
      }

      const habitats = await Habitat.find(searchQuery)
        .select('habitatName code')
        .limit(limit * 3)
        .lean()
        .exec();

      // Deduplicate by habitatName
      const seen = new Set();
      const unique = [];
      for (const h of habitats) {
        if (!seen.has(h.habitatName)) {
          seen.add(h.habitatName);
          unique.push({ habitatName: h.habitatName, code: h.code });
          if (unique.length >= limit) break;
        }
      }

      return NextResponse.json({ suggestions: unique });
    }

    // Regular search for other fields
    if (searchText.trim()) {
      const fieldCondition = {
        [searchField]: { $regex: '^' + searchText, $options: 'i' }
      };

      if (Object.keys(searchQuery).length > 0) {
        searchQuery = { $and: [searchQuery, fieldCondition] };
      } else {
        searchQuery = fieldCondition;
      }
    }

    // Get distinct values for the search field
    const distinctValues = await Habitat.distinct(searchField, searchQuery);

    // Manually limit the results since .limit() can't be used with .distinct()
    const limitedValues = distinctValues.slice(0, limit);

    return NextResponse.json({ suggestions: limitedValues });
  } catch (error) {
    console.error('Error getting autocomplete suggestions:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
