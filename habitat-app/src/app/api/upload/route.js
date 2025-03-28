import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

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
    
    
    
    // In a real app, you'd use a cloud storage service like AWS S3, Google Cloud Storage, or Azure Blob Storage
    // For this example, we'll store files in the public directory
    // Note: This approach won't work in production deployments - you should use a proper cloud storage solution
    const publicDir = path.join(process.cwd(), 'public/uploads');
    if (!existsSync(publicDir)) {
        await mkdir(publicDir, { recursive: true });
      }
      const imageUrls = [];

      for (const file of files) {
        if (file && file.arrayBuffer) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const filename = `${uuidv4()}_${file.name.replace(/\s/g, '_')}`;
          const filePath = path.join(publicDir, filename);
  
          await writeFile(filePath, buffer);
  
          const imageUrl = `/uploads/${filename}`;
          imageUrls.push(imageUrl);
        }
      }
    
    return NextResponse.json({ success: true, imageUrls });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { message: 'Error uploading image' },
      { status: 500 }
    );
  }
}