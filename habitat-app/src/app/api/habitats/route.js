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
    const { habitatName, location, date, notes, imageUrl } = data;
    
    // Log session user structure to understand what's available
    console.log("Session user:", session.user);
    
  
    
    // Prepare data for saving
    const habitatData = {
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
// Handler for GET requests to fetch all habitat entries
export async function GET(req) {
  try {
    await connectDB();
    
    // Get current user session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch all habitat entries
    const habitats = await Habitat.find().sort({ createdAt: -1 }).lean();
    
    return NextResponse.json({ habitats });
  } catch (error) {
    console.error('Error fetching habitats:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}