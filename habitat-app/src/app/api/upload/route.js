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
    const file = formData.get('image');
    
    if (!file) {
      return NextResponse.json({ message: 'No image uploaded' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${uuidv4()}_${file.name.replace(/\s/g, '_')}`;
    
    // In a real app, you'd use a cloud storage service like AWS S3, Google Cloud Storage, or Azure Blob Storage
    // For this example, we'll store files in the public directory
    // Note: This approach won't work in production deployments - you should use a proper cloud storage solution
    const publicDir = path.join(process.cwd(), 'public/uploads');
    if (!existsSync(publicDir)) {
        await mkdir(publicDir, { recursive: true });
      }
    const filePath = path.join(publicDir, filename);
    
    await writeFile(filePath, buffer);
    
    const imageUrl = `/uploads/${filename}`;
    
    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { message: 'Error uploading image' },
      { status: 500 }
    );
  }
}