import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { UPLOAD_FOLDER, ALLOWED_FORMATS } from '@/lib/imageUpload';

// Signs ONE direct browser-to-Cloudinary upload for a logged-in user.
// The API secret stays on the server; only the signature and the public
// parameters it covers are returned. The photo itself never passes through
// this app (see docs/notes/image-upload-size.md).
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary is not configured (CLOUDINARY_* environment variables missing)');
      return NextResponse.json({ message: 'Image upload is not configured on the server' }, { status: 500 });
    }

    let fileName = '';
    try {
      const body = await req.json();
      fileName = typeof body?.fileName === 'string' ? body.fileName : '';
    } catch {
      // No body: a generic name is used.
    }

    // Unique public id, locked into the signature so this signature can only
    // create this one image. Only safe characters are kept from the file name.
    const baseName = fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'image';
    const publicId = `${uuidv4()}_${baseName}`;

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
      allowed_formats: ALLOWED_FORMATS.join(','),
      folder: UPLOAD_FOLDER,
      public_id: publicId,
      timestamp,
    };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return NextResponse.json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      apiKey,
      signature,
      ...paramsToSign,
    });
  } catch (error) {
    console.error('Error signing Cloudinary upload:', error);
    return NextResponse.json({ message: 'Could not prepare the image upload' }, { status: 500 });
  }
}
