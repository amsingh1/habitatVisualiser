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
    const searchText = searchParams.get('q')?.trim() || '';
    let searchField = searchParams.get('field') || 'habitatName'; // Default to habitatName
    const context = searchParams.get('context') || 'habitats';
    const monthFilter = searchParams.get('monthFilter');
    const yearFilter = searchParams.get('yearFilter');
    const sortBy = searchParams.get('sortBy') || 'upload_desc';
    
    // Get individual advanced search parameters
    const advancedHabitatName = searchParams.get('habitatName');
    const advancedCountry = searchParams.get('country');
    const advancedState = searchParams.get('state');
    const advancedGroup = searchParams.get('group');
    const advancedUserName = searchParams.get('userName');
    
    const hasAdvancedSearch = advancedHabitatName || advancedCountry || advancedState || advancedGroup || advancedUserName;
    
    if (searchField === 'group') {
      searchField = 'habitatName'; // Default to habitatName for group
    }
    // Identify the user
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Build the search query
    let searchQuery = {};
    let andConditions = [];
    
    // If context is 'personal', only search user's own habitats
    if (context === 'personal') {
      if (userId) {
        andConditions.push({ user: userId });
      } else {
        andConditions.push({ userEmail: userEmail });
      }
    }
    
    // Check if advanced search criteria is provided
    if (hasAdvancedSearch) {
      // Add conditions for each non-empty field
      if (advancedHabitatName && advancedHabitatName.trim()) {
        andConditions.push({
          habitatName: { $regex: advancedHabitatName.trim(), $options: 'i' }
        });
      }
      
      if (advancedCountry && advancedCountry.trim()) {
        andConditions.push({
          country: { $regex: advancedCountry.trim(), $options: 'i' }
        });
      }
      
      if (advancedState && advancedState.trim()) {
        andConditions.push({
          state: { $regex: advancedState.trim(), $options: 'i' }
        });
      }
      
      if (advancedGroup && advancedGroup.trim()) {
        // For group, search by habitatName (group searches vegetation types with similar EVC codes)
        andConditions.push({
          habitatName: { $regex: advancedGroup.trim(), $options: 'i' }
        });
      }
      
      if (advancedUserName && advancedUserName.trim()) {
        andConditions.push({
          userName: { $regex: advancedUserName.trim(), $options: 'i' }
        });
      }
    } else if (searchText.trim()) {
      // Simple search mode - If search text is provided, add text search condition
      // Create search condition for the selected field - using exact match (case insensitive)
      andConditions.push({
        [searchField]: { $regex: `^${searchText}$`, $options: 'i' }
      });
    }
    
    // Combine all AND conditions
    if (andConditions.length > 0) {
      searchQuery.$and = andConditions;
    }
    
    // Month filter (based on observation date)
    if (monthFilter && monthFilter !== 'all') {
      const month = parseInt(monthFilter);
      if (!searchQuery.$and) {
        searchQuery.$and = [];
      }
      searchQuery.$and.push({
        $expr: { $eq: [{ $month: '$date' }, month] }
      });
    }
    
    // Year filter (based on observation date)
    if (yearFilter && yearFilter !== 'all') {
      const year = parseInt(yearFilter);
      if (!searchQuery.$and) {
        searchQuery.$and = [];
      }
      searchQuery.$and.push({
        $expr: { $eq: [{ $year: '$date' }, year] }
      });
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
    
    // Execute the search with filters and sorting
    const habitats = await Habitat.find(searchQuery).sort(sortOption);
    
    return NextResponse.json({ habitats });
  } catch (error) {
    console.error('Error searching habitats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}