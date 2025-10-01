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

    // Special handling for 'group' field type
    if (searchField === 'group' && searchText.trim()) {
      // First, find habitats matching the habitat name
      const matchingHabitats = await Habitat.find({
        habitatName: { $regex: `^${searchText}`, $options: 'i' }
      }).select('EVC_code').lean();

      // Extract unique first 3 characters of EVC codes
      const evcCodePrefixes = [...new Set(
        matchingHabitats
          .map(h => h.EVC_code)
          .filter(code => code && code.length > 1)
          .map(code => code.substring(0, 3))
      )];

      // If we found any matching EVC code prefixes
      if (evcCodePrefixes.length > 0) {
        // Find all habitats with matching EVC code prefixes
        const habitatsWithMatchingEVC = await Habitat.find({
          EVC_code: {
            $in: evcCodePrefixes.map(prefix => new RegExp(`^${prefix}`))
          }
        })
        .select('habitatName EVC_code')  // Only select the fields we need
        .limit(limit)
        .lean();
      
        return NextResponse.json({
          suggestions: habitatsWithMatchingEVC.map(h => ({
            habitatName: h.habitatName,
            EVC_code: h.EVC_code
          }))
        });
      }
      
      return NextResponse.json({ suggestions: [] });
    }

    // Regular search for other fields
    if (searchText.trim()) {
      // Create search condition for the selected field using regex for contains
      const fieldCondition = {
        [searchField]: { $regex: `${searchText}`, $options: 'i' }
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
