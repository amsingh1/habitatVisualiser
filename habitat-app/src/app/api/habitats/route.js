import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habitat from '@/models/Habitat';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Handler for POST requests to create a new habitat entry
export async function POST(req) {
  try {
    console.log("API endpoint called");
    
    // Parse the request data
    const data = await req.json();
    console.log("Received data:", data);
    
    // Add back session handling
    console.log("Getting session...");
    const session = await getServerSession(authOptions);
    console.log("Session:", session);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Add back database connection
    console.log("Connecting to database...");
    await connectDB();
    console.log("Connected to database");
    
    // Extract data
    const { habitatName, state, country, date, notes, dominantSpecies1, dominantSpecies2, dominantSpecies3, imageUrl, gpsCoordinate,
            vegClass, vegOrder, vegAlliance } = data;
    
    // Validate that either state+country or location is provided
    if ((!state || !country)) {
      return NextResponse.json(
        { success: false, message: 'Please provide both state and country' },
        { status: 400 }
      );
    }
    
    // Log session user structure to understand what's available
    console.log("Session user:", session.user);
    
    // Prepare data for saving
    const habitatData = {
      gpsCoordinate,
      habitatName: vegAlliance || vegOrder || vegClass || habitatName || '',
      state,
      country,
      date: date || new Date(),
      notes,
      dominantSpecies1,
      dominantSpecies2,
      dominantSpecies3,
      imageUrl,
      user: session.user.id,
      userName: session.user.name || 'Unknown',
      userEmail: session.user.email,
      vegClass: vegClass || '',
      vegOrder: vegOrder || '',
      vegAlliance: vegAlliance || '',
    };
    
    console.log("Habitat data to save:", habitatData);
    
    // Try to create the habitat
    console.log("Creating habitat entry...");
    const habitat = await Habitat.create(habitatData);
    console.log("Habitat created successfully:", habitat);
    
    return NextResponse.json(
      { success: true, message: 'Habitat created successfully', habitat },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in API route:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { success: false, message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
export async function GET(req) {
  try {
    await connectDB();
    
    // Get the URL from the request
    const url = new URL(req.url);
    
    // Check if this is a request for a specific habitat by ID
    const habitatId = url.searchParams.get('id');
    
    // Check if this is a request for slider images (public access)
    const isSliderRequest = url.searchParams.get('slider') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '5');
    
    // If habitatId is provided, fetch that specific habitat
    if (habitatId) {
      // Get current user session
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      
      // Find the specific habitat
      const habitat = await Habitat.findById(habitatId).lean();
      
      if (!habitat) {
        return NextResponse.json(
          { success: false, message: 'Habitat not found' },
          { status: 404 }
        );
      }
      
      // Send the habitat data
      return NextResponse.json({ success: true, habitat });
    }
    
    // Only check authentication for non-slider requests
    if (!isSliderRequest) {
      // Get current user session
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      
      // Get filter and sort parameters
      const monthFilter = url.searchParams.get('monthFilter');
      const yearFilter = url.searchParams.get('yearFilter');
      const sortBy = url.searchParams.get('sortBy') || 'upload_desc';
      
      // Build query for filters
      let query = {};
      
      // Month filter (based on observation date)
      if (monthFilter && monthFilter !== 'all') {
        const month = parseInt(monthFilter);
        if (!query.$and) {
          query.$and = [];
        }
        query.$and.push({
          $expr: { $eq: [{ $month: '$date' }, month] }
        });
      }
      
      // Year filter (based on observation date)
      if (yearFilter && yearFilter !== 'all') {
        const year = parseInt(yearFilter);
        if (!query.$and) {
          query.$and = [];
        }
        query.$and.push({
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
      
      // Fetch all habitat entries for authenticated users with filters and sorting
      const habitats = await Habitat.find(query).sort(sortOption).lean();
      return NextResponse.json({ habitats });
    } else {
      // For slider requests, return a limited set of images without requiring authentication
      const sliderImages = await Habitat.find({ imageUrl: { $exists: true, $ne: '' } })
        .select('imageUrl habitatName location')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
        
      return NextResponse.json({ sliderImages });
    }
  } catch (error) {
    console.error('Error fetching habitats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}


// Handler for DELETE requests to delete an existing habitat entry
export async function DELETE(req) {
  try {
    console.log("DELETE API endpoint called");
    
    // Get search parameters from URL
    const { searchParams } = new URL(req.url);
    const habitatId = searchParams.get('id');
    
    if (!habitatId) {
      return NextResponse.json(
        { success: false, message: 'Habitat ID is required' },
        { status: 400 }
      );
    }
    
    // Get current user session
    console.log("Getting session...");
    const session = await getServerSession(authOptions);
    console.log("Session:", session);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Connect to database
    console.log("Connecting to database...");
    await connectDB();
    console.log("Connected to database");
    
    // Find the habitat to delete
    const existingHabitat = await Habitat.findById(habitatId);
    
    if (!existingHabitat) {
      return NextResponse.json(
        { success: false, message: 'Habitat not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is authorized to delete this habitat
    // First check by user ID, then fall back to email if user ID is not available
    let isAuthorized = false;
    
    if (session.user.id && existingHabitat.user) {
      isAuthorized = existingHabitat.user.toString() === session.user.id;
    } else if (session.user.email && existingHabitat.userEmail) {
      isAuthorized = existingHabitat.userEmail === session.user.email;
    }
    
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Not authorized to delete this habitat' },
        { status: 403 }
      );
    }
    
    // Delete the habitat
    console.log("Deleting habitat entry...");
    await Habitat.findByIdAndDelete(habitatId);
    console.log("Habitat deleted successfully");
    
    return NextResponse.json(
      { success: true, message: 'Habitat deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE API route:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for PUT requests to update an existing habitat entry
export async function PUT(req) {
  try {
    console.log("UPDATE API endpoint called");
    
    // Parse the request data
    const data = await req.json();
    console.log("Received update data:", data);
    
    // Get current user session
    console.log("Getting session...");
    const session = await getServerSession(authOptions);
    console.log("Session:", session);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Connect to database
    console.log("Connecting to database...");
    await connectDB();
    console.log("Connected to database");
    
    // Extract habitat ID and updated data
    const { habitatId, habitatName, state, country, date, notes, dominantSpecies1, dominantSpecies2, dominantSpecies3, imageUrl, gpsCoordinate,
            vegClass, vegOrder, vegAlliance } = data;
    
    if (!habitatId) {
      return NextResponse.json(
        { success: false, message: 'Habitat ID is required' },
        { status: 400 }
      );
    }
    
    // Find the habitat to update
    const existingHabitat = await Habitat.findById(habitatId);
    
    if (!existingHabitat) {
      return NextResponse.json(
        { success: false, message: 'Habitat not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is authorized to update this habitat
    if (existingHabitat.user.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Not authorized to update this habitat' },
        { status: 403 }
      );
    }
    
    // Prepare data for updating
    const resolvedVegClass = vegClass !== undefined ? vegClass : existingHabitat.vegClass;
    const resolvedVegOrder = vegOrder !== undefined ? vegOrder : existingHabitat.vegOrder;
    const resolvedVegAlliance = vegAlliance !== undefined ? vegAlliance : existingHabitat.vegAlliance;
    const updateData = {
      habitatName: resolvedVegAlliance || resolvedVegOrder || resolvedVegClass || (habitatName !== undefined ? habitatName : existingHabitat.habitatName),
      state: state !== undefined ? state : existingHabitat.state,
      country: country !== undefined ? country : existingHabitat.country,
      date: date !== undefined ? date : existingHabitat.date,
      notes: notes !== undefined ? notes : existingHabitat.notes,
      dominantSpecies1: dominantSpecies1 !== undefined ? dominantSpecies1 : existingHabitat.dominantSpecies1,
      dominantSpecies2: dominantSpecies2 !== undefined ? dominantSpecies2 : existingHabitat.dominantSpecies2,
      dominantSpecies3: dominantSpecies3 !== undefined ? dominantSpecies3 : existingHabitat.dominantSpecies3,
      imageUrl: imageUrl !== undefined ? imageUrl : existingHabitat.imageUrl,
      gpsCoordinate: gpsCoordinate !== undefined ? gpsCoordinate : existingHabitat.gpsCoordinate,
      vegClass: vegClass !== undefined ? vegClass : existingHabitat.vegClass,
      vegOrder: vegOrder !== undefined ? vegOrder : existingHabitat.vegOrder,
      vegAlliance: vegAlliance !== undefined ? vegAlliance : existingHabitat.vegAlliance,
    };
    
    console.log("Habitat data to update:", updateData);
    
    // Update the habitat
    console.log("Updating habitat entry...");
    const updatedHabitat = await Habitat.findByIdAndUpdate(
      habitatId,
      updateData,
      { new: true } // Return the updated document
    );
    
    console.log("Habitat updated successfully:", updatedHabitat);
    
    return NextResponse.json(
      { success: true, message: 'Habitat updated successfully', habitat: updatedHabitat },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in UPDATE API route:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { success: false, message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}