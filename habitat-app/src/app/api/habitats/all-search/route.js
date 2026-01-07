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
    const criteriaParam = searchParams.get('criteria');
    
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
    if (criteriaParam) {
      try {
        const criteria = JSON.parse(decodeURIComponent(criteriaParam));
        
        // Add conditions for each non-empty field in criteria
        if (criteria.habitatName && criteria.habitatName.trim()) {
          andConditions.push({
            habitatName: { $regex: criteria.habitatName.trim(), $options: 'i' }
          });
        }
        
        if (criteria.country && criteria.country.trim()) {
          andConditions.push({
            country: { $regex: criteria.country.trim(), $options: 'i' }
          });
        }
        
        if (criteria.state && criteria.state.trim()) {
          andConditions.push({
            state: { $regex: criteria.state.trim(), $options: 'i' }
          });
        }
        
        if (criteria.group && criteria.group.trim()) {
          // For group, search by habitatName (group searches vegetation types with similar EVC codes)
          andConditions.push({
            habitatName: { $regex: criteria.group.trim(), $options: 'i' }
          });
        }
        
        if (criteria.userName && criteria.userName.trim()) {
          andConditions.push({
            userName: { $regex: criteria.userName.trim(), $options: 'i' }
          });
        }
      } catch (error) {
        console.error('Error parsing criteria:', error);
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
    
    // Month filter (based on createdAt)
    if (monthFilter && monthFilter !== 'all') {
      const month = parseInt(monthFilter);
      searchQuery.$expr = searchQuery.$expr || {};
      searchQuery.$expr.$and = searchQuery.$expr.$and || [];
      searchQuery.$expr.$and.push({ $eq: [{ $month: '$createdAt' }, month] });
    }
    
    // Year filter (based on createdAt)
    if (yearFilter && yearFilter !== 'all') {
      const year = parseInt(yearFilter);
      searchQuery.$expr = searchQuery.$expr || {};
      searchQuery.$expr.$and = searchQuery.$expr.$and || [];
      searchQuery.$expr.$and.push({ $eq: [{ $year: '$createdAt' }, year] });
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