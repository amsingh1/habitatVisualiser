import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with credentials from .env file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(req) {
  try {
    // Get current user session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('image');
    
    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No images uploaded' }, { status: 400 });
    }
    
    const imageUrls = [];
    
    for (const file of files) {
      if (file && file.arrayBuffer) {
        // Convert file to base64 for Cloudinary upload
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64File = buffer.toString('base64');
        const dataURI = `data:${file.type};base64,${base64File}`;
        
        // Generate a unique public_id using uuid
        const uniqueFilename = `${uuidv4()}_${file.name.replace(/\s/g, '_')}`;
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'your_app_name', // Customize this folder name
          public_id: uniqueFilename,
          resource_type: 'auto' // Auto-detect file type
        });
        
        // Store the secure URL from Cloudinary's response
        imageUrls.push(result.secure_url);
      }
    }
    
    return NextResponse.json({ success: true, imageUrls });
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    return NextResponse.json(
      { message: 'Error uploading image' },
      { status: 500 }
    );
  }
}