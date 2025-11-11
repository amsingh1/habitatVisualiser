import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Habitat from '@/models/Habitat';
import archiver from 'archiver';

// Simple Download Service - works with URLs as-is
class DownloadService {
  constructor() {
    this.timeout = 45000; // Increased timeout for corporate networks
    this.retryAttempts = 3; // More retry attempts
  }

  async downloadImageWithRetry(url, attempts = this.retryAttempts) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await this.downloadImage(url);
      } catch (error) {
        console.warn(`Download attempt ${i + 1}/${attempts} failed for ${url}: ${error.message}`);
        if (i === attempts - 1) throw error;
        
        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, i) + Math.random() * 1000, 10000);
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await this.delay(delay);
      }
    }
  }

  async downloadImage(url) {
    const originalUrl = url.trim();
    
    if (!originalUrl.startsWith('http')) {
      throw new Error(`Invalid URL: ${originalUrl}`);
    }

    console.log(`Downloading: ${originalUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(originalUrl, { 
        signal: controller.signal,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        redirect: 'follow',
        // Add keepAlive for better connection management
        keepalive: false
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} for ${originalUrl}`);
      }
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      console.log(`Content-Type: ${contentType} for ${originalUrl}`);
      
      const buffer = await response.arrayBuffer();
      
      if (buffer.byteLength === 0) {
        throw new Error(`Empty response for ${originalUrl}`);
      }
      
      console.log(`✅ Downloaded ${buffer.byteLength} bytes from ${originalUrl}`);
      
      return {
        buffer: Buffer.from(buffer),
        contentType: contentType,
        size: buffer.byteLength
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Timeout after ${this.timeout}ms for ${originalUrl}`);
      }
      
      // More detailed error information
      console.error(`Fetch error details:`, {
        url: originalUrl,
        error: error.message,
        stack: error.stack,
        cause: error.cause,
        name: error.name
      });
      
      throw new Error(`Failed to download ${originalUrl}: ${error.message} (${error.name})`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getFileExtension(url, contentType) {
    // Try to get extension from URL
    try {
      const urlParts = url.split('.');
      if (urlParts.length > 1) {
        const ext = urlParts.pop().split('?')[0].toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          return ext;
        }
      }
    } catch (e) {}
    
    // Fallback to content type
    const typeMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };
    
    return typeMap[contentType?.split(';')[0]] || 'jpg';
  }

  sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9\-_\.]/gi, '_');
  }
}

// Generate CSV for habitat metadata
function generateCSV(habitats) {
  const headers = [
    'ID', 'Habitat Name', 'State', 'Country', 'GPS Coordinate', 'Date', 'Notes',
    'Dominant Species 1', 'Dominant Species 2', 'Dominant Species 3',
    'Code', 'EVC Code', 'Author Name', 'Author Email', 'Created At', 
    'Image Count', 'Image URLs'
  ].join(',');

  const rows = habitats.map(habitat => [
    `"${habitat._id}"`,
    `"${habitat.habitatName || ''}"`,
    `"${habitat.state || ''}"`,
    `"${habitat.country || ''}"`,
    `"${habitat.gpsCoordinate || ''}"`,
    `"${habitat.date ? new Date(habitat.date).toISOString().split('T')[0] : ''}"`,
    `"${(habitat.notes || '').replace(/"/g, '""')}"`,
    `"${habitat.dominantSpecies1 || ''}"`,
    `"${habitat.dominantSpecies2 || ''}"`,
    `"${habitat.dominantSpecies3 || ''}"`,
    `"${habitat.code || ''}"`,
    `"${habitat.EVC_code || ''}"`,
    `"${habitat.userName || ''}"`,
    `"${habitat.userEmail || ''}"`,
    `"${new Date(habitat.createdAt).toISOString()}"`,
    `"${habitat.imageUrl ? habitat.imageUrl.length : 0}"`,
    `"${habitat.imageUrl ? habitat.imageUrl.join('; ') : ''}"`
  ].join(','));

  return headers + '\n' + rows.join('\n');
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { habitatIds, downloadType } = await req.json();

    if (!habitatIds?.length) {
      return NextResponse.json({ message: 'No habitats selected' }, { status: 400 });
    }

    const habitats = await Habitat.find({ _id: { $in: habitatIds } }).lean();
    if (!habitats.length) {
      return NextResponse.json({ message: 'No habitats found' }, { status: 404 });
    }

    const downloadService = new DownloadService();

    // CSV only
    if (downloadType === 'csv') {
      const csvContent = generateCSV(habitats);
      const filename = `habitat_data_${new Date().toISOString().split('T')[0]}.csv`;
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ZIP download
    if (downloadType === 'zip' || downloadType === 'images-only') {
      return new Promise(async (resolve, reject) => {
        try {
          const archive = archiver('zip', { zlib: { level: 9 } });
          const chunks = [];

          archive.on('data', chunk => chunks.push(chunk));
          archive.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const filename = `habitat_export_${new Date().toISOString().split('T')[0]}.zip`;
            
            resolve(new NextResponse(buffer, {
              headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
              },
            }));
          });
          archive.on('error', reject);

          // Add CSV metadata if ZIP
          if (downloadType === 'zip') {
            const csvContent = generateCSV(habitats);
            archive.append(csvContent, { name: 'habitat_metadata.csv' });
          }

          // Process images
          for (const habitat of habitats) {
            if (!habitat.imageUrl?.length) continue;

            const habitatFolder = downloadService.sanitizeFilename(
              `${habitat.habitatName}_${habitat._id.toString().slice(-6)}`
            );

            for (let i = 0; i < habitat.imageUrl.length; i++) {
              const imageUrl = habitat.imageUrl[i];
              try {
                if (!imageUrl?.trim()) continue;
                
                const imageData = await downloadService.downloadImageWithRetry(imageUrl);
                const extension = downloadService.getFileExtension(imageUrl, imageData.contentType);
                const filename = `${habitatFolder}/image_${i + 1}.${extension}`;
                
                archive.append(imageData.buffer, { name: filename });
              } catch (error) {
                console.error(`Failed to download image ${i + 1} for habitat ${habitat._id}:`, error.message);
                
                // Create detailed error report
                const errorReport = [
                  `DOWNLOAD ERROR REPORT`,
                  `===================`,
                  `Image: ${i + 1} of ${habitat.imageUrl.length}`,
                  `Habitat: ${habitat.habitatName || 'Unnamed'} (ID: ${habitat._id})`,
                  `URL: ${imageUrl}`,
                  `Error: ${error.message}`,
                  `Timestamp: ${new Date().toISOString()}`,
                  ``,
                  `TROUBLESHOOTING:`,
                  `- The URL may be temporarily unavailable`,
                  `- Check your internet connection`,
                  `- Try accessing the URL directly in a browser:`,
                  `  ${imageUrl}`,
                  ``,
                  `If the URL works in your browser but not here,`,
                  `there may be network/proxy restrictions preventing`,
                  `the server from accessing external URLs.`
                ].join('\n');
                
                archive.append(errorReport, { 
                  name: `${habitatFolder}/ERROR_image_${i + 1}.txt` 
                });
              }
            }
          }

          archive.finalize();
        } catch (error) {
          reject(error);
        }
      });
    }

    return NextResponse.json({ message: 'Invalid download type' }, { status: 400 });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}