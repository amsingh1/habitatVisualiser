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
    const { habitatName, location, date, notes, imageUrl, gpsCoordinate} = data;
    
    // Log session user structure to understand what's available
    console.log("Session user:", session.user);
    
  
    
    // Prepare data for saving
    const habitatData = {
      gpsCoordinate,
      habitatName,
      location,
      date: date || new Date(),
      notes,
      imageUrl,
      user: session.user.id, // Add this line to include the user ID
      userName: session.user.name || 'Unknown',
      userEmail: session.user.email
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
// Handler for GET requests to fetch habitat entries
export async function GET(req) {
  try {
    await connectDB();
    
    // Get the URL from the request
    const url = new URL(req.url);
    
    // Check if this is a request for slider images (public access)
    const isSliderRequest = url.searchParams.get('slider') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '5');
    
    // Only check authentication for non-slider requests
    if (!isSliderRequest) {
      // Get current user session
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      
      // Fetch all habitat entries for authenticated users
      const habitats = await Habitat.find().sort({ createdAt: -1 }).lean();
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