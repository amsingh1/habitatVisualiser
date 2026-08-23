import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habitat from '@/models/Habitat';

// Public, read-only summary counts for the homepage stats strip.
export async function GET() {
  try {
    await connectDB();

    const [observationCount, vegetationTypes, countries, contributors] = await Promise.all([
      Habitat.countDocuments(),
      Habitat.distinct('habitatName'),
      Habitat.distinct('country'),
      Habitat.distinct('userEmail'),
    ]);

    return NextResponse.json({
      observationCount,
      vegetationTypeCount: vegetationTypes.length,
      countryCount: countries.length,
      contributorCount: contributors.length,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
